const STOP_ID = 30139; // ID przystanku ZKM (Witomino Centrum)

function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pl-PL', { hour12: false });
    const clockElement = document.getElementById('clock');
    if (clockElement) clockElement.innerText = timeString;

    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    let dateString = now.toLocaleDateString('pl-PL', dateOptions);
    dateString = dateString.charAt(0).toUpperCase() + dateString.slice(1);
    
    const dateElement = document.getElementById('date');
    if (dateElement) dateElement.innerText = dateString;
}

function getAnimatedIconHTML(iconName) {
    const baseURL = "https://basmilius.github.io/weather-icons/production/fill/all/";
    return `<img src="${baseURL}${iconName}.svg" class="weather-icon" alt="Ikona pogody" />`;
}

function parseApiTime(tStr) {
    if (!tStr) return new Date();
    if (tStr.includes('T')) return new Date(tStr);
    const [h, m, s] = tStr.split(':');
    let d = new Date();
    d.setHours(parseInt(h, 10), parseInt(m, 10), parseInt(s || 0, 10));
    return d;
}

async function getBusDepartures() {
    const busElement = document.getElementById('bus-data');
    if (!busElement) return;

    busElement.classList.remove('content-animate');
    busElement.style.opacity = '0'; 

    try {
        const response = await fetch(`https://ckan2.multimediagdansk.pl/departures?stopId=${STOP_ID}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const now = new Date();
        let html = "";

        if (!data.departures || data.departures.length === 0) {
            busElement.innerHTML = "<div class='departure-row'>Brak odjazdów</div>";
            setTimeout(() => { busElement.classList.add('content-animate'); busElement.style.opacity = '1'; }, 400);
            return;
        }

        data.departures.slice(0, 5).forEach(bus => {
            let lineId = bus.routeId.toString();
            if (lineId.startsWith('10') && lineId.length > 3) { lineId = lineId.substring(2); }

            let depDate = bus.estimatedTime ? parseApiTime(bus.estimatedTime) : new Date();
            const diffMin = Math.floor((depDate - now) / 60000);
            
            let timeClass = diffMin <= 1 ? "time-left time-urgent" : "time-left";
            let timeLeftText = diffMin <= 1 ? "Wkrótce" : `${diffMin} min`;

            let delayHTML = `<span class="delay-ontime">planowo</span>`;
            if (bus.estimatedTime && bus.theoreticalTime) {
                let est = parseApiTime(bus.estimatedTime);
                let theo = parseApiTime(bus.theoreticalTime);
                let dMin = Math.round((est - theo) / 60000);
                
                if (dMin > 0) delayHTML = `<span class="delay-late">+${dMin} min</span>`;
                else if (dMin < 0) delayHTML = `<span class="delay-early">${dMin} min</span>`;
                else if (bus.status === "REALTIME") delayHTML = `<span class="delay-realtime">na czas</span>`;
            }

            html += `
                <div class="departure-row">
                    <span class="col-left line-number">${lineId}</span>
                    <span class="col-center">${delayHTML}</span>
                    <span class="col-right ${timeClass}">${timeLeftText}</span>
                </div>`;
        });
        
        setTimeout(() => { 
            busElement.innerHTML = html;
            busElement.classList.add('content-animate'); 
            busElement.style.opacity = '1'; 
        }, 400);

    } catch (e) { 
        busElement.innerHTML = `<div style="color:#FF3B30; font-size:16px;">Błąd danych ZKM</div>`; 
        setTimeout(() => { busElement.classList.add('content-animate'); busElement.style.opacity = '1'; }, 400);
    }
}

function getStaticSkmDepartures() {
    const skmElement = document.getElementById('skm-data');
    if (!skmElement) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const departureMinutes = [4, 11, 19, 26, 34, 41, 49, 56]; 
    let upcomingDepartures = [];
    
    for (let min of departureMinutes) {
        if (min >= currentMinute) {
            let timeStr = `${String(currentHour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
            upcomingDepartures.push({ diffMin: min - currentMinute, timeStr: timeStr });
        }
    }
    
    if (upcomingDepartures.length < 5) {
        let nextHour = (currentHour + 1) % 24;
        for (let min of departureMinutes) {
            let timeStr = `${String(nextHour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
            upcomingDepartures.push({ diffMin: (60 - currentMinute) + min, timeStr: timeStr });
            if (upcomingDepartures.length >= 5) break; 
        }
    }

    let html = "";
    upcomingDepartures.slice(0, 5).forEach(dep => {
        let timeClass = dep.diffMin <= 1 ? "time-left time-urgent" : "time-left";
        let timeLeftText = dep.diffMin <= 1 ? "Wkrótce" : `${dep.diffMin} min`;
        
        html += `
            <div class="departure-row">
                <span class="col-left line-number">Gdańsk</span>
                <span class="col-center time-exact">${dep.timeStr}</span>
                <span class="col-right ${timeClass}">${timeLeftText}</span>
            </div>`;
    });

    skmElement.innerHTML = html;
}

async function getWeather() {
    const weatherElement = document.getElementById('weather');
    if (!weatherElement) return;

    weatherElement.classList.remove('content-animate');
    weatherElement.style.opacity = '0';

    try {
        // Dodałem pobieranie windspeed i winddirection
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=54.51&longitude=18.53&current_weather=true');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const temp = Math.round(data.current_weather.temperature);
        const windSpeed = data.current_weather.windspeed;
        const windDir = data.current_weather.winddirection;
        
        const wmoCodesHTML = {
            0: getAnimatedIconHTML("day-clear"), 1: getAnimatedIconHTML("day-clear"), 
            2: getAnimatedIconHTML("partly-cloudy-day"), 3: getAnimatedIconHTML("cloudy"), 
            45: getAnimatedIconHTML("fog"), 48: getAnimatedIconHTML("fog"),
            51: getAnimatedIconHTML("drizzle"), 53: getAnimatedIconHTML("drizzle"), 55: getAnimatedIconHTML("drizzle"),
            61: getAnimatedIconHTML("rain"), 63: getAnimatedIconHTML("rain"), 65: getAnimatedIconHTML("rain"),
            71: getAnimatedIconHTML("snow"), 73: getAnimatedIconHTML("snow"), 75: getAnimatedIconHTML("snow"),
            80: getAnimatedIconHTML("rain"), 81: getAnimatedIconHTML("rain"), 82: getAnimatedIconHTML("rain"),
            95: getAnimatedIconHTML("thunderstorms"), 96: getAnimatedIconHTML("thunderstorms"), 99: getAnimatedIconHTML("thunderstorms")
        };
        
        const code = data.current_weather.weathercode;
        const iconHTML = wmoCodesHTML[code] || getAnimatedIconHTML("cloudy");

        // Funkcja pomocnicza dla strzałki wiatru
        const windArrow = `<span style="display:inline-block; transform:rotate(${windDir}deg); font-weight:bold; color:#007AFF;">↑</span>`;
        
        setTimeout(() => { 
            // Dodano wiatr i strzałkę kierunku do wyświetlania
            weatherElement.innerHTML = `
                ${iconHTML} 
                <span>${temp}°C</span>
                <span style="font-size:18px; color:#8E8E93; margin-left:15px; border-left: 2px solid #F2F2F7; padding-left:15px;">
                    ${windArrow} ${windSpeed} km/h
                </span>`;
            weatherElement.classList.add('content-animate'); 
            weatherElement.style.opacity = '1'; 
        }, 400);
        
    } catch (e) { 
        weatherElement.innerText = `Błąd pogody ❌`; 
        setTimeout(() => { weatherElement.classList.add('content-animate'); weatherElement.style.opacity = '1'; }, 400);
    }
}

setInterval(updateClock, 1000); 
setInterval(getBusDepartures, 10000); 
setInterval(getStaticSkmDepartures, 10000); 
setInterval(getWeather, 600000); 

updateClock();
getBusDepartures();
getStaticSkmDepartures();
getWeather();
