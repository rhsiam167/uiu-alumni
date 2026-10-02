// Shared Footer Component
import { getRelativeRoot, getIcon } from '../utils.js';

export function renderFooter() {
  const container = document.getElementById('footer-container');
  if (!container) return;

  const root = getRelativeRoot();

  const footerHtml = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="footer-logo-text">UIU <span>Alumni</span></div>
            <p class="footer-desc">
              Connecting United International University alumni, students, and faculty. Fostering lifelong connections, career growth, and mentorship.
            </p>
          </div>

          <div>
            <h4 class="footer-heading">Quick Links</h4>
            <ul class="footer-links">
              <li><a href="${root}index.html">Home</a></li>
              <li><a href="${root}pages/mentorship.html">Mentorship</a></li>
              <li><a href="${root}pages/jobs.html">Jobs & Internships</a></li>
              <li><a href="${root}pages/events.html">Events & Reunions</a></li>
            </ul>
          </div>

          <div>
            <h4 class="footer-heading">Contact Us</h4>
            <div class="footer-contact-item">
              <span>${getIcon('mapPin')} United City, Madani Avenue, Badda, Dhaka-1212, Bangladesh</span>
            </div>
            <div class="footer-contact-item">
              <span>${getIcon('mail')} alumni@uiu.ac.bd</span>
            </div>
            <div class="footer-contact-item">
              <span>${getIcon('phone')} +880 1700 000000</span>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <div>© ${new Date().getFullYear()} UIU Alumni Tracker Portal. All rights reserved.</div>
          <div>United International University</div>
        </div>
      </div>
    </footer>
  `;

  container.innerHTML = footerHtml;
}
