const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const uid2 = require("uid2");
const moment = require("moment");
const app = express();
const PORT = 3000;
app.use(bodyParser.text());
app.use(bodyParser.json());

// modèle
const User = require("./models/User");

// connexion à mongoose
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/justify-api", {
  useNewUrlParser: true
});

// Nombre de caractères par ligne
const limit = 80;

// fonction qui reçoit une ligne, la met à 80 caractères, puis la retourne
const newSentence = line => {
  line = line.trim();
  // tableau de phrases vides
  let formatedLine = [];
  if (line.length < limit) {
    const lineWords = line.trim().split(" ");
    let completedLine = [];
    let missingSpaces = limit - line.length;
    for (let i = 0; i < lineWords.length; i++) {
      if (i < missingSpaces) {
        completedLine.push(lineWords[i] + " ");
      } else {
        completedLine.push(lineWords[i]);
      }
    }
    formatedLine.push(completedLine.join(" "));
  } else {
    formatedLine.push(line);
  }
  return formatedLine;
};

// fonction qui ajoute chaque mot, petit à petit, dans la variable `sentence`, jusqu'à temps d'atteindre la limite imposée
const justifiedParagraph = text => {
  const words = text.split(" ");
  // phrase vide qu'on remplira mot par mot
  let sentence = "";
  // tableau de phrases vides
  let justifiedText = [];

  for (let i = 0; i < words.length; i++) {
    if (sentence.length + words[i].length < limit) {
      if (words[i].includes("\n")) {
        lineBreakTab = words[i].split(/[\r\n]+/);
        sentence += " " + lineBreakTab[0];
        justifiedText.push(newSentence(sentence));
        sentence = "";
        sentence += lineBreakTab[1];
      } else {
        sentence += " " + words[i];
      }
      if (i === words.length - 1) {
        justifiedText.push(newSentence(sentence));
        sentence = "";
      }
    } else {
      justifiedText.push(newSentence(sentence));
      sentence = "";
      i--;
    }
  }
  return justifiedText.join("\n");
};

// fonction qui réinitialise le compteur
const resetCounter = async token => {
  const now = moment()
    .format("YYYY-MM-DD")
    .toString();
  const user = await User.findOne({ token: token });
  if (user.date !== now) {
    console.log("la date a changé");
    user.counter = 0;
    user.date = now;
    await user.save();
  }
};

// routes
app.post("/api/token", async (req, res) => {
  try {
    const token = uid2(64);
    const now = moment()
      .format("YYYY-MM-DD")
      .toString();
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      // si l'utilisateur existe, renvoyer le token
      res.json(user.token);
    } else {
      // si l'utilisateur est inconnu, le rajouter dans la BDD et renvoyer le token
      const newUser = new User({
        email: req.body.email,
        token: token,
        counter: 0,
        date: now
      });
      newUser.save();
      res.json(newUser.token);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/justify", async (req, res) => {
  try {
    // récupérer le token dans les headers envoyés par le client
    const token = req.headers.authorization;
    if (token) {
      await resetCounter(token);
    }
    sentences = []; // réinitialise le tableau de phrases à chaque appel
    let wordCount = req.body.split(/[\r\n\" "]+/).length;

    const user = await User.findOne({ token: token });
    if (user) {
      if (user.counter === 80000) {
        res.status(402).send("Payment required");
      } else if (user.counter + wordCount <= 80000) {
        user.counter += wordCount;
        await user.save();
        const justified = justifiedParagraph(req.body);
        res.send(justified);
      } else {
        res.json(
          `You have ${80000 -
            user.counter} words left. If you need more, wait for 24 hours or subscribe to our full services.`
        );
      }
    } else {
      res.json("Unauthorized");
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// démarrage du serveur
app.listen(PORT, () => {
  console.log("server started on port ", PORT);
});
