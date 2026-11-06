const headerHTML =
`
  <header>
      <div class="wrap header-inner">
      <a class="brand" href="index.html">
          <img
          src="images/S4W-Nepal.png"
          alt="S4W Nepal"
          class="brand-logo"
          />
      </a>
      
      <!-- Navigation Menu -->
      <nav aria-label="Main navigation">
          <a href="index.html">Home</a>
          <a href="map.html">Explore Map</a>
          <a href="events.html">Flood Events</a>
          <a href="evidence.html">Gallery</a>
          <a href="data.html">Data</a>
      </nav>
      <a class="button small-button" href="contribute.html">Add Observation</a>
      </div>
  </header>
`

const footerHTML = 
`
  <footer>
      <div class="wrap footer-inner">
      <div class="brand">
          <img
          src="images/S4W-Nepal.png"
          alt="S4W Nepal"
          class="brand-logo-mini"
          />
      </div>
      <div>
          <a href="index.html">Home</a>
          <a href="data.html">Data</a>
          <a href="https://s4w-nepal.smartphones4water.org/">S4W Nepal ↗</a>
      </div>
      </div>
  </footer>
`

// Insert sections into the page.
const headerContainer = document.getElementById("site-header");
const footerContainer = document.getElementById("site-footer");

if (headerContainer) headerContainer.innerHTML = headerHTML;
if (footerContainer) footerContainer.innerHTML = footerHTML;

// Highlight the current navigation page.
const currentPage =
  window.location.pathname.split("/").pop() || "index.html";

document.querySelectorAll("#site-header nav a").forEach((link) => {
  if (link.getAttribute("href") === currentPage) {
    link.setAttribute("aria-current", "page");
  }
});