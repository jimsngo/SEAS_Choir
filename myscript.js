document.addEventListener('DOMContentLoaded', () => {
  // update the sunday date
  $("#date").text(getNextSundaysDate)

  fetch('assets/data/website.json')
  .then(response => { 
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    for (let index = 0; index < data.sections.length; index++) {
      const element = data.sections[index];
      let html_template = $("#mass-section-template .mass-section").clone();
      html_template.find(".section-name").text(element.name);
      html_template.find(".singer").text(element.singer ? "(" + element.singer + ")" : "");
      html_template.find(".snippet").text(element.snippet ? element.snippet : "");
      html_template.find(".song").text(element.song ? element.song : "");
      if (!element.song) {
        html_template.find(".song").addClass("d-none")
      }
      html_template.find(".audio_url").attr("src", element.audio_url ? element.audio_url : "");
      html_template.find(".lyric_url").attr("href", element.lyric_url ? element.lyric_url : "");
      if (!element.lyric_url) {
        html_template.find(".lyric_url").addClass("d-none")
      }
      
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