document.addEventListener('DOMContentLoaded', () => {
  // update the sunday date
  $("#date").text(getNextSundaysDate)

  fetch('mydata.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      document.getElementById("Name").innerHTML = data.name;
      document.getElementById("Date").innerHTML = data.date;
      document.getElementById("Time").innerHTML = data.time;
      document.getElementById("Cantor").innerHTML = data.cantor;
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
        html_template.find(".snippet").text(element.snippet ? element.snippet : "");
        html_template.find(".author").text(element.author ? element.author : "");
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