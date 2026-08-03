// Shortnur - Support page logic (FAQ accordion + contact form)
import { auth, db, ref, push, set, onAuthStateChanged, signOut, showToast, escapeHtml, icon, initMotion } from "./firebase-config.js";

initMotion();

const FAQS = [
  {
    q: 'How do I create a short link?',
    a: 'Just paste your long URL into the box on the homepage and click "Shorten URL". Your short link is generated instantly. You can also create a free account to save and manage all your links in one place.'
  },
  {
    q: 'How much can I earn per click?',
    a: 'Earnings depend on the traffic quality and your country. On average you can earn $0.50 per 1000 clicks on the free plan. Premium users earn up to 5x more. Earnings are credited to your dashboard automatically.'
  },
  {
    q: 'When can I withdraw my earnings?',
    a: 'You can request a withdrawal once your balance reaches the $10 minimum. Withdrawals are processed within 48 hours via PayPal, UPI or bank transfer. Withdrawal requests are subject to our anti-fraud review.'
  },
  {
    q: 'Why do my visitors see ad pages before the link?',
    a: 'That is how you earn money! Every visitor passes through a short ad page before reaching your destination link. This is what generates your revenue. The ads are fast and non-intrusive by design.'
  },
  {
    q: 'Why is my short link not working?',
    a: 'Common causes: 1) The link was flagged for spam or abuse, 2) Your link is disabled, 3) A temporary ad-network issue. Check your link status in the dashboard. If the issue persists, contact support with your short URL.'
  },
  {
    q: 'Can I use custom aliases?',
    a: 'Yes! Free users can create custom aliases for their links. Pick a memorable name like "shortnur.to/myspecialdeal" instead of a random code. Custom aliases must be unique across the platform.'
  },
  {
    q: 'How does the referral program work?',
    a: 'Share your unique referral link from the Referrals page. When someone signs up through your link, you earn 20% commission on their lifetime earnings — forever. Your referrals are tracked in real time.'
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. All data is stored securely in Google Firebase with encrypted connections. We never sell your personal data. Links are automatically scanned for malware and malicious content.'
  },
  {
    q: 'Can I track analytics for my links?',
    a: 'Absolutely. The Analytics page shows click trends over time, top countries, devices, and performance of every link. Create a free account to unlock analytics for all your links.'
  },
  {
    q: 'What are the link rules?',
    a: 'We do not allow links to illegal content, adult material without age verification, phishing, malware, or anything that violates our Terms of Service. Violating links are disabled and earnings forfeited.'
  }
];

let currentUser = null;

renderFAQs();

function renderFAQs() {
  const list = document.getElementById('faqList');
  list.innerHTML = FAQS.map((faq, i) => `
    <div class="faq-item reveal d${(i % 5) + 1}" data-qa="${escapeHtml(faq.q.toLowerCase())}" data-aa="${escapeHtml(faq.a.toLowerCase())}">
      <button class="faq-question" type="button">
        <span>${escapeHtml(faq.q)}</span>
        <span class="faq-icon">+</span>
      </button>
      <div class="faq-answer"><p>${escapeHtml(faq.a)}</p></div>
    </div>
  `).join('');

  list.querySelectorAll('.faq-item').forEach((item) => {
    item.querySelector('.faq-question').addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      list.querySelectorAll('.faq-item.open').forEach((el) => el.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  initMotion();
}

// ---------- Search ----------
document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const items = document.querySelectorAll('.faq-item');
  const noResults = document.getElementById('faqList');

  if (!query) {
    items.forEach((i) => {
      i.classList.remove('hidden-faq');
      i.querySelector('.faq-answer p').innerHTML = escapeHtml(FAQS[[...items].indexOf(i)].a);
    });
    return;
  }

  let count = 0;
  items.forEach((item) => {
    const q = item.dataset.qa;
    const a = item.dataset.aa;
    const matches = q.includes(query) || a.includes(query);
    item.classList.toggle('hidden-faq', !matches);
    if (matches) {
      count++;
      const p = item.querySelector('.faq-answer p');
      p.innerHTML = highlightText(FAQS[[...items].indexOf(item)].a, query);
    }
  });

  showToast(count ? `Found ${count} answer${count > 1 ? 's' : ''}` : 'No results found', count ? 'success' : 'info');
});

function highlightText(text, query) {
  const escaped = escapeHtml(text);
  const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return escaped.replace(regex, '<span class="highlight">$1</span>');
}

// ---------- Navbar ----------
const menuToggle = document.getElementById('menuToggle');
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  const container = document.getElementById('navAuth');
  if (user) {
    container.innerHTML = `<a href="dashboard.html" class="btn btn-primary btn-sm">Dashboard</a>
      <button id="navLogout" class="btn btn-ghost btn-sm">Logout</button>`;
    document.getElementById('navLogout').addEventListener('click', async () => {
      await signOut(auth);
      showToast('Logged out', 'success');
      setTimeout(() => (window.location.href = 'index.html'), 600);
    });
  } else {
    container.innerHTML = `<a href="login.html" class="btn btn-ghost btn-sm">Login</a>
      <a href="login.html?tab=signup" class="btn btn-primary btn-sm">Sign Up Free</a>`;
  }
});

// ---------- Contact form ----------
const contactForm = document.getElementById('contactForm');
contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('cName').value.trim();
  const email = document.getElementById('cEmail').value.trim();
  const topic = document.getElementById('cTopic').value;
  const message = document.getElementById('cMessage').value.trim();

  const errorEl = document.getElementById('contactError');
  const successEl = document.getElementById('contactSuccess');
  errorEl.classList.remove('show');
  successEl.classList.remove('show');

  if (!name || !email || !message) {
    errorEl.textContent = 'Please fill in all fields.';
    errorEl.classList.add('show');
    return;
  }

  const submitBtn = contactForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const msgRef = push(ref(db, 'supportMessages'));
    await set(msgRef, {
      name,
      email,
      topic,
      message,
      uid: currentUser ? currentUser.uid : null,
      status: 'new',
      createdAt: Date.now(),
    });

    successEl.textContent = 'Message sent! Our team will reply to your email shortly.';
    successEl.classList.add('show');
    contactForm.reset();
    showToast('Message sent successfully!', 'success');
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Failed to send message. Please try again or email support directly.';
    errorEl.classList.add('show');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `${icon('send')} Send Message`;
  }
});
