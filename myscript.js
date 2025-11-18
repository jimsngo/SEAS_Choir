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

  // Fetch mass info (for name, date, time, cantor, PDFs)
  fetch('mass_info.json')
    .then(response => response.json())
    .then(massInfo => {
      document.getElementById("Name").innerHTML = massInfo.mass_name || '';
      document.getElementById("Time").innerHTML = massInfo.time || '';
      // Display cantor profile image next to name if available
      const cantorName = massInfo.cantor ? massInfo.cantor.trim() : "";
      if (cantorName) {
        const imgName = cantorName.split(" ")[0];
        const imgFile = `images/${imgName.charAt(0).toUpperCase() + imgName.slice(1).toLowerCase()}.jpg`;
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
      document.getElementById("lyrics_pdf").href = massInfo.lyrics_pdf || '#';
      document.getElementById("cantor_pdf").href = massInfo.cantor_pdf || '#';
      document.getElementById("guitar_pdf").href = massInfo.guitar_pdf || '#';
      document.getElementById("mass_setting").href = massInfo.mass_setting || '#';
    });

  // Fetch moments.json for all moment blocks
  fetch('moments.json')
    .then(response => response.json())
    .then(moments => {
      moments.forEach(element => {
        let html_template = $("#mass-section-template .mass-section").clone();
        html_template.find(".moment").text(element.moment);
        html_template.find(".singer").text(element.singer ? "(" + element.singer + ")" : "");
        html_template.find(".title").text(element.title ? element.title : "");
        html_template.find(".author").text(element.author ? element.author : "");
        html_template.find(".snippet").text(element.snippet ? element.snippet : "");

        // Audio file (if present)
        if (element.mp3) {
          html_template.find(".audio_url").attr("src", element.mp3);
        } else {
          html_template.find(".audio_url").remove();
        }
        // Optionally, add links for PDF and lyrics
        // html_template.find(".lyric_url").attr("href", element.lyrics ? element.lyrics : "");

        html_template.removeClass("d-none")
        $("#main-content").append(html_template);
      });
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
