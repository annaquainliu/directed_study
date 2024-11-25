const express = require('express');
const app = express();
const path = require('path');
const {visualOutputToHTML, evalCode, changeText, programToString, execCode} = require('./live_sync.js');
const fs = require('fs');
const homePage = fs.readFileSync('./public/index.html', 'utf8');

let currentlyClickedId = -1;


function editHomePage(code, visualOutput) {
  let key = `<textarea id="code_input" name="code">`;
  return homePage.replace(key, key + code).replace(" <!-- visual -->", visualOutput);
}

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/compute', (req, res) => {
  let codeStr = req.query.code;
  evalCode(codeStr);
  let htmlCode = visualOutputToHTML();
  res.send(editHomePage(codeStr, htmlCode));
});

app.get("/click", (req, res) => {
  currentlyClickedId = req.query.id;
  console.log(currentlyClickedId);
  res.send({});
});

app.get("/change_text", (req, res) => {
  changeText(currentlyClickedId, req.query.change_text);
  let newProgram = programToString();
  execCode();
  let updatedVisual = visualOutputToHTML();
  res.send(editHomePage(newProgram, updatedVisual));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
