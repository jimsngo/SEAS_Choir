// myscript.js
//
// Main client-side script for SEAS Choir website.
// - Loads choir data from mass_info.json and populates the mass name, time, and cantor.
// - Displays the cantor's profile image (if available) next to their name.
// - Loads moments.json and populates the title, author, snippet, audio link for each moments.
// - Polls for updates every 30 seconds and refreshes display if changes are detected.

let cachedMassInfo = null;
let cachedMoments = null;

document.addEventListener('DOMContentLoaded', () => {

  // Fetch mass info (for name, date, time, cantor, PDFs)
  function loadMassInfo() {
    fetch('../../config/mass_info.json?t=' + new Date().getTime())
      .then(response => response.json())
      .then(massInfo => {
        // Check if data has changed
        if (JSON.stringify(cachedMassInfo) !== JSON.stringify(massInfo)) {
          cachedMassInfo = massInfo;
          updateMassInfoDisplay(massInfo);
        }
      })
      .catch(error => console.error('Error fetching mass_info:', error));
  }

  function updateMassInfoDisplay(massInfo) {
    document.getElementById("Name").innerHTML = massInfo.mass_name || '';
    document.getElementById("Date").innerHTML = dayjs(massInfo.date).format("MMMM DD, YYYY");
    const dateTimeStr = massInfo.date + " " + massInfo.time;
    document.getElementById("Time").innerHTML = dayjs(dateTimeStr, "YYYY-MM-DD HH:mm").format("hh:mm A");
    const cantorName = massInfo.cantor ? massInfo.cantor.trim() : "";
    if (cantorName) {
      const imgName = cantorName.split(" ")[0];
      const imgFile = `../../src/data/images/${imgName.charAt(0).toUpperCase() + imgName.slice(1).toLowerCase()}.jpg`;
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
  }

  // Fetch moments.json for all moment blocks
  function loadMoments() {
    fetch('../../config/moments.json?t=' + new Date().getTime())
      .then(response => response.json())
      .then(moments => {
        // Check if data has changed
        if (JSON.stringify(cachedMoments) !== JSON.stringify(moments)) {
          cachedMoments = moments;
          updateMomentsDisplay(moments);
        }
      })
      .catch(error => {
        console.error('Error fetching moments.json:', error);
      });
  }

  function updateMomentsDisplay(moments) {
    // Clear existing moments
    $("#main-content").html('<div id="mass-section-template"></div>');
    moments.forEach(element => {
      let html_template = $("#mass-section-template .mass-section").clone();
      if (html_template.length === 0) {
        // Create template if it doesn't exist
        html_template = $(`
          <section class="mass-section py-2">
            <div class="card shadow-sm">
              <div class="card-header bg-info text-dark">
                <h5 class="mb-0"><b class="moment"></b> <span class="singer"></span></h5>
              </div>
              <div class="card-body bg-light">
                <b class="title" style="display:block; margin-bottom:0.75em;"></b>
                <footer class="author blockquote-footer text-muted"></footer>
                <blockquote><i>"<span class="snippet"></span>"</i></blockquote>
                <div class="d-flex align-items-center justify-content-between mt-3 w-100">
                  <audio class="flex-grow-1 w-100" controls>
                    <source class="audio_url" src="" type="audio/mpeg">
                  </audio>
                </div>
              </div>
            </div>
          </section>
        `);
      }
      html_template.find(".moment").text(element.moment);
      html_template.find(".singer").text(element.singer ? "(" + element.singer + ")" : "");
      html_template.find(".title").text(element.title ? element.title : "");
      html_template.find(".author").text(element.author ? element.author : "");
      html_template.find(".snippet").text(element.snippet ? element.snippet : "");

      let mp3Path = element.mp3 || '';
      if (mp3Path) {
        let adjustedPath = '../../' + mp3Path;
        html_template.find(".audio_url").attr("src", adjustedPath);
      } else {
        html_template.find(".audio_url").remove();
      }

      html_template.removeClass("d-none");
      $("#main-content").append(html_template);
    });
  }

  // Initial load
  loadMassInfo();
  loadMoments();

  // Poll for updates every 30 seconds
  setInterval(() => {
    loadMassInfo();
    loadMoments();
  }, 30000);
});

function getNextSundaysDate() {
  const today = moment();
  const nextSunday = today.day() == 0 ? today : today.day(7)
  return nextSunday.format("MMMM DD, YYYY");
}