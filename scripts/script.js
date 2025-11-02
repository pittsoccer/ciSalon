const params = new URLSearchParams(window.location.search);
const usernameSpan = document.getElementById("username");
const passwordSpan = document.getElementById("password");
if (usernameSpan) usernameSpan.textContent = params.get("username");
if (passwordSpan) passwordSpan.textContent = params.get("password");

function authenticate() {
  return gapi.auth2.getAuthInstance()
    .signIn({ scope: SCOPES })
    .then(() => console.log("Sign-in successful"))
    .catch(err => console.error("Error signing in", err));
}

function loadClient() {
  gapi.client.setApiKey(API_KEY);
  return gapi.client.load("https://content.googleapis.com/discovery/v1/apis/calendar/v3/rest")
    .then(() => console.log("GAPI client loaded"))
    .catch(err => console.error("Error loading GAPI client", err));
}

function checkAvailability() {
  const dateInput = document.getElementById("date").value;
  if (!dateInput) {
    alert("Please select a date");
    return;
  }

  const timeMin = `${dateInput}T08:00:00Z`;
  const timeMax = `${dateInput}T18:00:00Z`;

  gapi.client.calendar.freebusy.query({
    timeMin: timeMin,
    timeMax: timeMax,
    timeZone: 'UTC',
    items: [{ id: CALENDAR_ID }]
  }).then(response => {
    const busy = response.result.calendars[CALENDAR_ID].busy;
    const allSlots = generateTimeSlots(timeMin, timeMax, 30);
    const availableSlots = allSlots.filter(slot =>
      !busy.some(busyTime => (
        new Date(slot.start) < new Date(busyTime.end) &&
        new Date(slot.end) > new Date(busyTime.start)
      ))
    );

    displaySlots(availableSlots);
  });
}

function generateTimeSlots(startISO, endISO, intervalMinutes) {
  const slots = [];
  let current = new Date(startISO);
  const end = new Date(endISO);

  while (current < end) {
    const next = new Date(current.getTime() + intervalMinutes * 60000);
    slots.push({ start: current.toISOString(), end: next.toISOString() });
    current = next;
  }

  return slots;
}

function displaySlots(slots) {
  const container = document.getElementById("slotsContainer");
  container.innerHTML = "<h3>Available Time Slots:</h3>";
  if (slots.length === 0) {
    container.innerHTML += "<p>No available slots.</p>";
    return;
  }

  slots.forEach(slot => {
    const div = document.createElement("div");
    div.className = "slot";
    const timeLabel = new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.innerText = timeLabel;
    div.onclick = () => bookAppointment(slot);
    container.appendChild(div);
  });
}

function bookAppointment(slot) {
  const name = prompt("Enter your name for the appointment:");
  if (!name) return;

  const event = {
    summary: `Hair Appointment – ${name}`,
    start: { dateTime: slot.start, timeZone: 'UTC' },
    end: { dateTime: slot.end, timeZone: 'UTC' }
  };

  gapi.client.calendar.events.insert({
    calendarId: CALENDAR_ID,
    resource: event
  }).then(event => {
    alert("Appointment booked successfully!");
    checkAvailability();
  });
}

const API_KEY = 'YOUR_API_KEY';
const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const CALENDAR_ID = 'stylist_email@group.calendar.google.com';

gapi.load("client:auth2", () => {
  gapi.auth2.init({ client_id: CLIENT_ID });
});
