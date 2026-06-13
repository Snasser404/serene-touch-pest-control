/* ===================================================================
   Google Analytics 4 (GA4)
   -------------------------------------------------------------------
   TO TURN ON: create a free GA4 property at https://analytics.google.com,
   copy your Measurement ID (looks like G-ABCD1234), and paste it below in
   place of "G-XXXXXXXXXX". Analytics activate immediately on the next push.
   Until then this does nothing (no tracking, no requests).
=================================================================== */
(function () {
  "use strict";
  var GA4_ID = "G-XXXXXXXXXX"; // <-- paste your GA4 Measurement ID here

  // Not configured yet (still the placeholder) -> do nothing.
  if (!GA4_ID || GA4_ID.indexOf("G-X") === 0) return;

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_ID);
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag("js", new Date());
  gtag("config", GA4_ID);

  // Make gtag available for custom events (e.g. quote-form submissions).
  window.gtag = window.gtag || gtag;
})();
