const express = require('express');
const app = express();
const path = require('path');
const {visualOutputToHTML, evalCode, changeText, moveShape, changeSigma} = require('./live_sync.js');
const fs = require('fs');
const homePage = fs.readFileSync('./public/index.html', 'utf8');

let currentPossibleOutputs = [];
let currentlyClickedId = -1;


function editHomePage(code, visualOutput) {
  let key = `<textarea id="code_input" name="code">`;
  return homePage.replace(key, key + code).replace(" <!-- visual -->", visualOutput);
}

/**
 * Displays the possible resulting changes to the user
 * 
 * @param {List<JSON>} results : resulting output from change
 */
function displayOutputs(results) {
 
  // Only one possible change, no need to notify the user
  if (results.length == 1) {
    return editHomePage(results[0].code, results[0].visualOutput);
  }
  currentPossibleOutputs = results;
  // If there are multiple changes, time to show possible changes to the user
  let notifElement = `<form class="notification" action="/select_change">
                        <span> Select Option </span>
                        <input id="selected_change" type="hidden" name="selection">`;
  let scripts = [];
  for (let i = 0; i < results.length; i++) {
    notifElement += `<div class="option" id="option${i}" value=${i}>Option ${i}</div>`;
    let script =  `document.getElementById("option${i}").addEventListener("click", () => { 
                      document.getElementById("visual").innerHTML = \`${results[i].visualOutput}\`; 
                      document.getElementById("code_input").value = \`${results[i].code}\`;
                      document.getElementById("selected_change").value = ${i};
                   });`;
    scripts.push(script);
  }
  notifElement += `<button type="submit">Submit Change</button>`;
  notifElement += "</form>";

  // Default to show first change
  let editedPage = editHomePage(results[0].code, results[0].visualOutput);
  // Add the notification element to the page
  editedPage = editedPage.replace("<body>", `<body>${notifElement}`);
  // Make the code and output uneditable 
  editedPage = editedPage.replace(`<div id="split_pane">`, `<div id="split_pane" style="pointer-events: none;">`);

  // Add the scripts to the end of the html object
  editedPage.replace("</html>", "");
  editedPage += "<script> window.onload = () => { \n ";
  for (let script of scripts) {
    editedPage += script;
  }
  editedPage += "};</script>"; 

  // Finish the HTML tag
  editedPage += "</html>";
  return editedPage;
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
  res.send({});
});

app.get("/change_text", (req, res) => {
  res.send(displayOutputs(changeText(currentlyClickedId, req.query.change_text)));
});

app.get("/move_x", (req, res) => {
  res.send(displayOutputs(moveShape(currentlyClickedId, "x", req.query.move_x)));
});

app.get("/move_y", (req, res) => {
  let output = displayOutputs(moveShape(currentlyClickedId, "y", req.query.move_y));
  res.send(output);
});

app.get("/select_change", (req, res) => {
  let requestedChange = currentPossibleOutputs[parseInt(req.query.selection)];
  changeSigma(requestedChange.sigma);
  res.send(editHomePage(requestedChange.code, requestedChange.visualOutput));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
