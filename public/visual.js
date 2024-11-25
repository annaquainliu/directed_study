
let visualDiv = document.getElementById("visual");

// Whenever we click on a shape, we send a post request to the server 
// to set the currently clicked
for (let child of visualDiv.children) {
    child.addEventListener("click", () => {
        // Set a temporary border
        child.style.border = "3px solid red";

        // Remove the border after 2 seconds
        setTimeout(() => {
            child.style.border = "none";
        }, 2000);

        fetch(`http://localhost:3000/click?id=${child.id}`)
        .then((response) => response.json())
        .then((json) => console.log(json));
    });
}

