// myscript.js
//
// Main client-side script for SEAS Choir website.
// - Loads choir data from mass_info.json and populates the mass name, time, and cantor.
// - Displays the cantor's profile image (if available) next to their name.
// - Loads moments.json and populates the title, author, snippet, audio link for each moments.

document.addEventListener('DOMContentLoaded', () => {

  // Fetch mass info (for name, date, time, cantor, PDFs)
  fetch('mass_info.json')
    .then(response => response.json())
    .then(massInfo => {
      document.getElementById("Name").innerHTML = massInfo.mass_name || '';
      document.getElementById("Date").innerHTML = dayjs(massInfo.date).format("MMMM DD, YYYY");
      const dateTimeStr = massInfo.date + " " + massInfo.time; // "2025-11-30 17:30"
      document.getElementById("Time").innerHTML = dayjs(dateTimeStr, "YYYY-MM-DD HH:mm").format("hh:mm A");
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
        let mp3Path = element.mp3 || '';
        if (mp3Path) {
          html_template.find(".audio_url").attr("src", mp3Path);
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