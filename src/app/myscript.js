document.addEventListener('DOMContentLoaded', async () => {
    const v = Date.now(); // Cache buster for the JSON files only
    
    try {
        // Start both fetches at the exact same time (Parallel)
        const [infoRes, momentsRes] = await Promise.all([
            fetch(`config/mass_info.json?v=${v}`),
            fetch(`config/moments.json?v=${v}`)
        ]);

        const data = await infoRes.json();
        const moments = await momentsRes.json();

        // 1. Update Header
        document.getElementById('Name').textContent = data.mass_name;
        document.getElementById('Date').textContent = data.date;
        document.getElementById('Time').textContent = data.time;
        document.getElementById('Cantor').textContent = data.cantor;
        
        const cantorImg = document.getElementById('cantor-image');
        if (data.cantor_image) {
            cantorImg.src = data.cantor_image;
            cantorImg.style.display = 'inline-block';
        }

        // 2. Load Moments using your Template
        const mainContent = document.getElementById('main-content');
        const templateSection = document.querySelector('#mass-section-template section');
        
        mainContent.innerHTML = ''; // Clear once

        moments.forEach(m => {
            const newSection = templateSection.cloneNode(true);
            newSection.classList.remove('d-none');

            newSection.querySelector('.moment').textContent = m.moment.replace(/_/g, ' ');
            newSection.querySelector('.singer').textContent = m.singer ? `(${m.singer})` : '';
            newSection.querySelector('.title').textContent = m.title;
            newSection.querySelector('.author').textContent = m.author || 'Unknown';
            newSection.querySelector('.snippet').textContent = m.snippet || '';
            
            const audio = newSection.querySelector('audio');
            audio.src = m.mp3;
            
            // Link updates
            newSection.querySelector('.pdf-btn')?.setAttribute('href', m.pdf);
            newSection.querySelector('.txt-btn')?.setAttribute('href', m.txt);

            mainContent.appendChild(newSection);
        });
    } catch (err) {
        console.error("Initialization failed:", err);
    }
});