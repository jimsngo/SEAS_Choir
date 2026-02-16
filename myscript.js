let cachedMassInfo = null;
let cachedMoments = null;

document.addEventListener('DOMContentLoaded', () => {

  // 1. Fetch mass info
  function loadMassInfo() {
    // Relative path works everywhere
    fetch('config/mass_info.json?t=' + new Date().getTime())
      .then(response => response.json())
      .then(massInfo => {
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
      const imgFile = `src/data/images/${imgName.charAt(0).toUpperCase() + imgName.slice(1).toLowerCase()}.jpg`;
      const img = new window.Image();
      img.onload = function () {
        document.getElementById("Cantor").innerHTML = `<img src='${imgFile}' alt='${cantorName}' style='width:30px; height:30px; border-radius:50%; object-fit:cover; margin-right:8px;'>` + cantorName;
      };
      img.onerror = function () { document.getElementById("Cantor").innerHTML = cantorName; };
      img.src = imgFile;
    } else {
      document.getElementById("Cantor").innerHTML = cantorName;
    }
  }

  // 2. Fetch moments
  function loadMoments() {
    fetch('config/moments.json?t=' + new Date().getTime())
      .then(response => response.json())
      .then(moments => {
        if (JSON.stringify(cachedMoments) !== JSON.stringify(moments)) {
          cachedMoments = moments;
          updateMomentsDisplay(moments);
        }
      })
      .catch(error => console.error('Error fetching moments.json:', error));
  }

  function updateMomentsDisplay(moments) {
    $("#main-content").html('<div id="mass-section-template"></div>');
    moments.forEach(element => {
      let html_template = $(`
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

      html_template.find(".moment").text(element.moment);
      html_template.find(".singer").text(element.singer ? "(" + element.singer + ")" : "");
      html_template.find(".title").text(element.title || "");
      html_template.find(".author").text(element.author || "");
      html_template.find(".snippet").text(element.snippet || "");

      let mp3Path = element.mp3 || '';
      if (mp3Path) {
        // Universal Fix: Remove leading slash and encode spaces for GitHub
        let cleanPath = mp3Path.startsWith('/') ? mp3Path.substring(1) : mp3Path;
        html_template.find(".audio_url").attr("src", encodeURI(cleanPath));
      } else {
        html_template.find("audio").remove();
      }
      $("#main-content").append(html_template);
    });
  }

  loadMassInfo();
  loadMoments();
  setInterval(() => { loadMassInfo(); loadMoments(); }, 30000);
});