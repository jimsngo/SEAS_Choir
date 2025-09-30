// myscript.js
//
// Main client-side script for SEAS Choir website.
// - Dynamically displays the next Sunday's date in the header.
// - Loads choir data from mydata.json and populates the page (name, time, cantor, PDFs, music outline, etc).
// - Displays the cantor's profile image (if available) next to their name.
// - Builds the music outline dynamically from the sections in mydata.json.
// - Uses Moment.js for date calculations and jQuery for DOM manipulation.
document.addEventListener('DOMContentLoaded', () => {
  // Dynamically set the #Date element to next Sunday's date
  document.getElementById("Date").innerHTML = getNextSundaysDate();

  fetch('mydata.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      document.getElementById("Name").innerHTML = data.name;
      // document.getElementById("Date").innerHTML = data.date; // now set dynamically
      document.getElementById("Time").innerHTML = data.time;
      // Display cantor profile image next to name if available
      const cantorName = data.cantor ? data.cantor.trim() : "";
      let cantorImg = "";
      if (cantorName) {
        // Try to match first name (case-insensitive) to image file
        const imgName = cantorName.split(" ")[0];
        const imgFile = `images/${imgName.charAt(0).toUpperCase() + imgName.slice(1).toLowerCase()}.jpg`;
        // Create a temporary image to check if it exists
        const img = new window.Image();
        img.onload = function () {
          document.getElementById("Cantor").innerHTML = `<img src='${imgFile}' alt='${cantorName}' style='width:30px; height:30px; border-radius:50%; object-fit:cover; margin-right:8px;'>` + cantorName;
        };
        img.onerror = function () {
          document.getElementById("Cantor").innerHTML = cantorName;
        };
        img.src = imgFile;
      } else {
        document.getElementById("Cantor").innerHTML = cantorName;
      }
      document.getElementById("lyrics_pdf").href = data.lyrics_pdf;
      document.getElementById("cantor_pdf").href = data.cantor_pdf;
      document.getElementById("guitar_pdf").href = data.guitar_pdf;
      document.getElementById("mass_setting").href = data.mass_setting;

      // Create HTML elements to display Music outline
      for (let index = 0; index < data.sections.length; index++) {
        const element = data.sections[index];
        let html_template = $("#mass-section-template .mass-section").clone();
        html_template.find(".moment").text(element.moment);
        html_template.find(".singer").text(element.singer ? "(" + element.singer + ")" : "");
        html_template.find(".title").text(element.title ? element.title : "");
        html_template.find(".author").text(element.author ? element.author : "");
        html_template.find(".snippet").text(element.snippet ? element.snippet : "");

        if (!element.song) {
          html_template.find(".song").addClass("d-none")
        }
        html_template.find(".audio_url").attr("src", element.audio_url ? element.audio_url : "");
        // html_template.find(".lyric_url").attr("href", element.lyric_url ? element.lyric_url : "");

        html_template.removeClass("d-none")
        $("#main-content").append(html_template);
      }
    })
    .catch(error => {
      console.error('Error fetching the JSON file:', error);
    });
});

function getNextSundaysDate() {
  const today = moment();
  const nextSunday = today.day() == 0 ? today : today.day(7)
  return nextSunday.format("MMMM DD, YYYY");
}
