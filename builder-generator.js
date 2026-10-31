/* =========================================================
   PROJECT SARAE — SITE GENERATOR
   Turns what you fill in on the Site Builder tab (plus the
   AI-written page text) into a complete website: HTML pages,
   one stylesheet, one script, policy pages, sitemap.
   Used by admin-builder.js. You never need to edit this file.
   ========================================================= */
(function (root) {
  "use strict";

  var PAGE_TYPES = {
    home: { label: "Home", slug: "index" },
    about: { label: "About", slug: "about" },
    services: { label: "Services & prices", slug: "services" },
    contact: { label: "Contact", slug: "contact" },
    booking: { label: "Book online", slug: "book" },
    reviews: { label: "Google reviews", slug: "reviews" },
    gallery: { label: "Gallery", slug: "gallery" },
    faq: { label: "FAQ", slug: "faq" },
    store: { label: "Shop", slug: "shop" },
    members: { label: "Member area", slug: "members" },
    custom: { label: "Custom page", slug: "page" }
  };
  var POLICIES = {
    privacy: { title: "Privacy Policy", slug: "privacy-policy" },
    terms: { title: "Terms of Service", slug: "terms" },
    refund: { title: "Cancellation & Refund Policy", slug: "refund-policy" },
    cookies: { title: "Cookie Policy", slug: "cookie-policy" },
    accessibility: { title: "Accessibility Statement", slug: "accessibility" }
  };
  var STYLES = {
    elegant: { label: "Elegant", head: "Playfair Display", body: "Lato", fonts: "family=Playfair+Display:wght@500;600;700&family=Lato:wght@400;700", radius: "4px", headWeight: 600, upper: false },
    modern: { label: "Modern", head: "DM Sans", body: "DM Sans", fonts: "family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,800", radius: "14px", headWeight: 800, upper: false },
    bold: { label: "Bold", head: "Archivo Black", body: "Inter", fonts: "family=Archivo+Black&family=Inter:wght@400;600", radius: "0px", headWeight: 400, upper: true },
    soft: { label: "Soft & luxe", head: "Cormorant Garamond", body: "Nunito Sans", fonts: "family=Cormorant+Garamond:wght@500;600;700&family=Nunito+Sans:wght@400;700", radius: "999px", headWeight: 600, upper: false }
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function slugify(s) { return String(s || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "page"; }
  function lines(t) { return String(t || "").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean); }
  function parts(l, n) { var p = l.split("|").map(function (x) { return x.trim(); }); while (p.length < n) p.push(""); return p; }
  function safeUrl(u) { u = String(u || "").trim(); return /^(https?:\/\/|mailto:|tel:)/i.test(u) ? u : ""; }
  function paras(t) { return String(t || "").split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join(""); }
  function telHref(p) { return "tel:" + String(p || "").replace(/[^\d+]/g, ""); }
  function price(p) { p = String(p || "").trim(); if (!p) return ""; return /^\d/.test(p) ? "$" + p : p; }
  var LINKS = { book: "", contact: "", services: "" }; // set for each site in generate()

  function services(st) {
    return lines(st.servicesText).map(function (l) { var p = parts(l, 3); return { name: p[0], price: p[1], text: p[2] }; }).filter(function (s) { return s.name; });
  }
  function products(st) {
    return lines(st.productsText).map(function (l) { var p = parts(l, 5); return { name: p[0], price: p[1], link: safeUrl(p[2]), img: safeUrl(p[3]), text: p[4] }; }).filter(function (x) { return x.name; });
  }
  function payItems(st) {
    return lines(st.paymentsText).map(function (l) { var p = parts(l, 3); return { name: p[0], price: p[1], link: safeUrl(p[2]) }; }).filter(function (x) { return x.name && x.link; });
  }
  function featuredReviews(st) {
    return lines(st.reviewsText).map(function (l) { var p = parts(l, 3); var r = Math.max(1, Math.min(5, parseInt(p[1], 10) || 5)); return { name: p[0], rating: r, text: p[2] }; }).filter(function (x) { return x.name && x.text; });
  }
  function gallery(st) { return lines(st.galleryText).map(safeUrl).filter(Boolean); }

  function pageFile(p) { return p.type === "home" ? "index.html" : (p.slug || slugify(p.title)) + ".html"; }
  function on(st, k) { return !!(st.features && st.features[k]); }

  /* ---------------- Assistant knowledge (saved for the chat function) ---------------- */
  function assistantInfo(st) {
    var out = [];
    out.push("Business: " + st.business + (st.niche ? " (" + st.niche + ")" : "") + (st.city ? " in " + st.city : ""));
    if (st.tagline) out.push("Tagline: " + st.tagline);
    if (st.about) out.push("About: " + st.about);
    var sv = services(st);
    if (sv.length) out.push("Services and prices:\n" + sv.map(function (s) { return "- " + s.name + (s.price ? ": " + price(s.price) : "") + (s.text ? " — " + s.text : ""); }).join("\n"));
    if (st.hoursText) out.push("Hours:\n" + st.hoursText);
    if (st.address) out.push("Address: " + st.address);
    if (st.phone) out.push("Phone: " + st.phone);
    if (st.email) out.push("Email: " + st.email);
    if (on(st, "booking") && st.bookingUrl) out.push("Online booking is on the website's Book page.");
    if (on(st, "store")) { var pr = products(st); if (pr.length) out.push("Products sold online:\n" + pr.map(function (x) { return "- " + x.name + (x.price ? ": " + price(x.price) : ""); }).join("\n")); }
    if (st.policies && st.policies.refund) out.push("Cancellation policy: cancel at least " + (st.cancelHours || 24) + " hours ahead." + (st.depositText ? " Deposits: " + st.depositText : "") + (st.refundText ? " Refunds: " + st.refundText : ""));
    if (st.assistantExtra) out.push("Extra answers from the owner:\n" + st.assistantExtra);
    return out.join("\n\n").slice(0, 7900);
  }

  /* ---------------- Default copy when AI hasn't written a page ---------------- */
  function fallback(st, p) {
    var b = st.business, where = st.city ? " in " + st.city : "";
    var map = {
      home: { hero: { eyebrow: st.niche || "Welcome", title: st.tagline || b, sub: st.about ? st.about.split(/(?<=\.)\s/)[0] : "Serving customers" + where + "." },
        sections: [{ kind: "text", heading: "Welcome to " + b, body: st.about || "" }] },
      about: { hero: { eyebrow: "About us", title: "Meet " + b, sub: "" }, sections: [{ kind: "text", heading: "Our story", body: st.about || "" }] },
      services: { hero: { eyebrow: "Services", title: "What we offer", sub: "" }, sections: [] },
      contact: { hero: { eyebrow: "Contact", title: "Get in touch", sub: "We’d love to hear from you." }, sections: [] },
      booking: { hero: { eyebrow: "Book online", title: "Book your appointment", sub: "Pick a time that works for you." }, sections: [] },
      reviews: { hero: { eyebrow: "Reviews", title: "What our clients say", sub: "" }, sections: [] },
      gallery: { hero: { eyebrow: "Gallery", title: "Our work", sub: "" }, sections: [] },
      faq: { hero: { eyebrow: "FAQ", title: "Questions & answers", sub: "" }, sections: [] },
      store: { hero: { eyebrow: "Shop", title: "Shop online", sub: "" }, sections: [] },
      members: { hero: { eyebrow: "Members", title: "Member area", sub: "" }, sections: [] },
      custom: { hero: { eyebrow: b, title: p.title, sub: p.brief || "" }, sections: p.brief ? [{ kind: "text", heading: p.title, body: p.brief }] : [] }
    };
    var c = map[p.type] || map.custom;
    c.meta_description = (p.title + " | " + b + where).slice(0, 150);
    return c;
  }

  /* ---------------- AI sections → HTML ---------------- */
  function sectionHtml(s, i) {
    if (!s || !s.kind) return "";
    var alt = i % 2 ? " alt" : "";
    var h = s.heading ? "<h2>" + esc(s.heading) + "</h2>" : "";
    var items = Array.isArray(s.items) ? s.items : [];
    if (s.kind === "cards") return '<section class="sec' + alt + '"><div class="wrap">' + h + (s.intro ? '<p class="lead">' + esc(s.intro) + "</p>" : "") +
      '<div class="cards">' + items.map(function (x) { return '<div class="card reveal"><h3>' + esc(x.title) + "</h3><p>" + esc(x.text) + "</p></div>"; }).join("") + "</div></div></section>";
    if (s.kind === "steps") return '<section class="sec' + alt + '"><div class="wrap">' + h +
      '<ol class="steps">' + items.map(function (x, n) { return '<li class="reveal"><span class="num">' + (n + 1) + "</span><div><h3>" + esc(x.title) + "</h3><p>" + esc(x.text) + "</p></div></li>"; }).join("") + "</ol></div></section>";
    if (s.kind === "faq") return '<section class="sec' + alt + '"><div class="wrap narrow">' + h +
      '<div class="faq">' + items.map(function (x) { return "<details class=\"reveal\"><summary>" + esc(x.q) + "</summary><p>" + esc(x.a) + "</p></details>"; }).join("") + "</div></div></section>";
    if (s.kind === "split") return '<section class="sec' + alt + '"><div class="wrap split"><div>' + h + paras(s.body) + "</div>" +
      '<ul class="ticks reveal">' + (Array.isArray(s.bullets) ? s.bullets : []).map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul></div></section>";
    return '<section class="sec' + alt + '"><div class="wrap narrow reveal">' + h + paras(s.body) + "</div></section>";
  }

  /* ---------------- Feature modules ---------------- */
  function servicesBlock(st, limit) {
    var sv = services(st); if (!sv.length) return "";
    var pay = {}; if (on(st, "payments")) payItems(st).forEach(function (x) { pay[x.name.toLowerCase()] = x.link; });
    var list = limit ? sv.slice(0, limit) : sv;
    return '<section class="sec"><div class="wrap"><h2>' + (limit ? "Popular services" : "Services & prices") + '</h2><div class="menu">' +
      list.map(function (s) {
        var link = pay[s.name.toLowerCase()];
        return '<div class="menu-item reveal"><div class="mi-top"><h3>' + esc(s.name) + "</h3>" + (s.price ? '<span class="mi-price">' + esc(price(s.price)) + "</span>" : "") + "</div>" +
          (s.text ? "<p>" + esc(s.text) + "</p>" : "") + (link ? '<a class="btn btn-sm" href="' + esc(link) + '" target="_blank" rel="noopener">Pay online</a>' : "") + "</div>";
      }).join("") + "</div>" + (limit && sv.length > limit && LINKS.services ? '<p class="center"><a class="btn btn-ghost" href="' + LINKS.services + '">See all services</a></p>' : "") + "</div></section>";
  }
  function paymentsBlock(st) {
    if (!on(st, "payments")) return "";
    var names = {}; services(st).forEach(function (s) { names[s.name.toLowerCase()] = 1; });
    var extra = payItems(st).filter(function (x) { return !names[x.name.toLowerCase()]; });
    if (!extra.length) return "";
    return '<section class="sec alt"><div class="wrap"><h2>Pay online</h2><div class="cards">' + extra.map(function (x) {
      return '<div class="card reveal"><h3>' + esc(x.name) + "</h3>" + (x.price ? '<p class="mi-price">' + esc(price(x.price)) + "</p>" : "") +
        '<a class="btn" href="' + esc(x.link) + '" target="_blank" rel="noopener">Pay securely</a></div>';
    }).join("") + '</div><p class="fine">Payments are processed securely by Stripe.</p></div></section>';
  }
  function stars(n) { var s = ""; for (var i = 1; i <= 5; i++) s += i <= n ? "★" : "☆"; return '<span class="stars" aria-label="' + n + ' out of 5 stars">' + s + "</span>"; }
  function googleLinks(st) {
    var id = String(st.placeId || "").trim().replace(/[^A-Za-z0-9_-]/g, "");
    return {
      read: id ? "https://search.google.com/local/reviews?placeid=" + id : safeUrl(st.mapsUrl),
      write: id ? "https://search.google.com/local/writereview?placeid=" + id : safeUrl(st.mapsUrl)
    };
  }
  function reviewsBlock(st, compact) {
    if (!on(st, "reviews")) return "";
    var rv = featuredReviews(st), g = googleLinks(st);
    if (compact && !rv.length) return "";
    var cards = rv.slice(0, compact ? 3 : 50).map(function (r) {
      return '<figure class="review reveal">' + stars(r.rating) + "<blockquote>“" + esc(r.text) + "”</blockquote><figcaption>" + esc(r.name) + ' <span class="gtag">Google review</span></figcaption></figure>';
    }).join("");
    var btns = (g.read ? '<a class="btn btn-ghost" href="' + esc(g.read) + '" target="_blank" rel="noopener">Read all reviews on Google</a>' : "") +
      (!compact && g.write ? '<a class="btn" href="' + esc(g.write) + '" target="_blank" rel="noopener">Leave us a review</a>' : "");
    var widget = !compact && st.reviewsEmbed ? '<div class="embed-widget">' + st.reviewsEmbed + "</div>" : "";
    return '<section class="sec alt"><div class="wrap"><h2>' + (compact ? "Loved by our clients" : "Our Google reviews") + "</h2>" +
      (cards ? '<div class="reviews">' + cards + "</div>" : "") + widget + (btns ? '<p class="center btn-row">' + btns + "</p>" : "") + "</div></section>";
  }
  function bookingBlock(st) {
    var u = safeUrl(st.bookingUrl);
    if (!on(st, "booking") || !u) return '<section class="sec"><div class="wrap narrow center"><p>Online booking is coming soon. ' + (st.phone ? 'Call <a href="' + telHref(st.phone) + '">' + esc(st.phone) + "</a> to book." : "Contact us to book.") + "</p></div></section>";
    var frameable = /(cal\.com|calendly\.com|leadconnectorhq\.com|msgsndr\.com|\/widget\/booking|square\.site|squareup\.com\/appointments|setmore\.com|youcanbook\.me|tidycal\.com|zcal\.co)/i.test(u);
    return '<section class="sec"><div class="wrap">' +
      (frameable ? '<div class="book-frame"><iframe src="' + esc(u) + '" title="Book an appointment" loading="lazy"></iframe></div>' : "") +
      '<p class="center btn-row"><a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener">' + (frameable ? "Open booking in a new tab" : "Book now") + "</a></p></div></section>";
  }
  function mapBlock(st) {
    if (!on(st, "map") || !st.address) return "";
    return '<div class="map"><iframe title="Map to ' + esc(st.business) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=' + encodeURIComponent(st.address) + '&output=embed"></iframe></div>';
  }
  function hoursList(st) {
    var h = lines(st.hoursText); if (!h.length) return "";
    return '<ul class="hours">' + h.map(function (l) { var p = l.split(/[:|]\s*/); return p.length > 1 ? "<li><span>" + esc(p[0]) + "</span><b>" + esc(p.slice(1).join(": ")) + "</b></li>" : "<li>" + esc(l) + "</li>"; }).join("") + "</ul>";
  }
  function contactBlock(st) {
    var info = '<div class="contact-info reveal"><h2>Visit or reach us</h2>' +
      (st.address ? "<p><b>Address</b><br>" + esc(st.address) + "</p>" : "") +
      (st.phone ? '<p><b>Phone</b><br><a href="' + telHref(st.phone) + '">' + esc(st.phone) + "</a></p>" : "") +
      (st.email ? '<p><b>Email</b><br><a href="mailto:' + esc(st.email) + '">' + esc(st.email) + "</a></p>" : "") +
      (st.hoursText ? "<p><b>Hours</b></p>" + hoursList(st) : "") + "</div>";
    var to = String(st.formEmail || st.email || "").trim();
    var form = on(st, "contact") && /@/.test(to) ? '<form class="form reveal" action="https://formsubmit.co/' + esc(to) + '" method="POST">' +
      '<h2>Send a message</h2><input type="hidden" name="_subject" value="New website message for ' + esc(st.business) + '">' +
      '<input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off"><input type="hidden" name="_template" value="table">' +
      '<label>Name<input name="name" required maxlength="100"></label><label>Email<input type="email" name="email" required maxlength="200"></label>' +
      '<label>Phone (optional)<input name="phone" maxlength="40"></label><label>Message<textarea name="message" rows="5" required maxlength="2000"></textarea></label>' +
      '<button class="btn" type="submit">Send message</button></form>' : "";
    return '<section class="sec"><div class="wrap split">' + info + form + "</div>" + '<div class="wrap">' + mapBlock(st) + "</div></section>";
  }
  function leadBlock(st) {
    var u = safeUrl(st.leadFormUrl);
    if (!on(st, "leads") || !u) return "";
    return '<section class="sec"><div class="wrap narrow center"><h2>' + esc(st.leadTitle || "Get offers & updates") + "</h2><p>" + esc(st.leadText || "Join our list for openings, specials, and reminders. Unsubscribe anytime.") + "</p>" +
      '<form class="inline-form" action="' + esc(u) + '" method="POST" target="_blank"><input type="email" name="EMAIL" placeholder="Your email" required aria-label="Your email">' +
      '<input type="hidden" name="email_address_check" value=""><input type="hidden" name="locale" value="en"><button class="btn" type="submit">Sign up</button></form></div></section>';
  }
  function galleryBlock(st, limit) {
    var g = gallery(st); if (!g.length) return "";
    if (limit) g = g.slice(0, limit);
    return '<section class="sec"><div class="wrap"><div class="gallery">' + g.map(function (u) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener" class="reveal"><img src="' + esc(u) + '" alt="' + esc(st.business) + ' photo" loading="lazy"></a>'; }).join("") + "</div></div></section>";
  }
  function storeBlock(st) {
    var pr = products(st);
    if (!pr.length) return '<section class="sec"><div class="wrap narrow center"><p>New products are coming soon.</p></div></section>';
    return '<section class="sec"><div class="wrap"><div class="products">' + pr.map(function (x) {
      return '<div class="product reveal">' + (x.img ? '<img src="' + esc(x.img) + '" alt="' + esc(x.name) + '" loading="lazy">' : '<div class="ph"></div>') +
        "<h3>" + esc(x.name) + "</h3>" + (x.price ? '<p class="mi-price">' + esc(price(x.price)) + "</p>" : "") + (x.text ? "<p>" + esc(x.text) + "</p>" : "") +
        (x.link ? '<a class="btn" href="' + esc(x.link) + '" target="_blank" rel="noopener">Buy now</a>' : '<span class="fine">Available in store</span>') + "</div>";
    }).join("") + '</div><p class="fine center">Checkout is handled securely by Stripe.</p></div></section>';
  }
  function membersBlock(st) {
    var u = safeUrl(st.membersUrl);
    return '<section class="sec"><div class="wrap narrow center reveal"><h2>Members</h2><p>' + esc(st.membersText || "Sign in to manage your bookings, memberships, and account.") + "</p>" +
      (u ? '<p class="btn-row"><a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener">Member sign in</a></p>' : '<p class="fine">Member sign-in is coming soon.</p>') + "</div></section>";
  }
  function ctaBand(st) {
    var book = on(st, "booking") && safeUrl(st.bookingUrl) && LINKS.book, href = book ? LINKS.book : LINKS.contact;
    return '<section class="sec band"><div class="wrap narrow center"><h2>' + esc(st.ctaTitle || (book ? "Ready when you are." : "Let’s talk.")) + "</h2>" +
      '<p class="btn-row">' + (href ? '<a class="btn btn-light" href="' + href + '">' + (book ? "Book now" : "Contact us") + "</a>" : "") +
      (st.phone ? '<a class="btn btn-outline-light" href="' + telHref(st.phone) + '">Call ' + esc(st.phone) + "</a>" : "") + "</p></div></section>";
  }

  /* ---------------- Policy templates ---------------- */
  function policyBody(st, key, date) {
    var b = esc(st.business), law = esc(st.lawState || "the state where we operate"), contact =
      (st.email ? '<a href="mailto:' + esc(st.email) + '">' + esc(st.email) + "</a>" : "") + (st.phone ? (st.email ? " or " : "") + esc(st.phone) : "") || "the contact page";
    var who = [];
    if (on(st, "contact")) who.push("<li><b>Contact form:</b> messages are delivered to us through FormSubmit (formsubmit.co).</li>");
    if (on(st, "booking") && st.bookingUrl) who.push("<li><b>Online booking:</b> appointments are scheduled through our booking provider, which receives the details you enter.</li>");
    if (on(st, "payments") || on(st, "store")) who.push("<li><b>Payments:</b> handled by Stripe. We never see or store your full card number.</li>");
    if (on(st, "assistant")) who.push("<li><b>Chat assistant:</b> questions you type into the chat are processed by Google’s Gemini AI service to write a reply. Please don’t share sensitive personal information in the chat.</li>");
    if (on(st, "map")) who.push("<li><b>Google Maps:</b> the embedded map is provided by Google.</li>");
    if (on(st, "reviews")) who.push("<li><b>Google reviews:</b> review links and any review widget are provided by Google or the widget provider.</li>");
    if (on(st, "leads")) who.push("<li><b>Email list:</b> if you sign up, your email is stored by our email service so we can send updates. You can unsubscribe anytime.</li>");
    var T = {
      privacy: "<p>This policy explains what information " + b + " collects through this website and how we use it.</p>" +
        "<h2>Information we collect</h2><p>We only collect what you choose to give us, such as your name, email, phone number, and message when you contact us, book, or buy. Our website host may keep basic technical logs (like IP address and browser type) for security.</p>" +
        "<h2>How we use it</h2><p>To answer your questions, schedule and confirm appointments, process orders, and, if you opt in, send updates. We do not sell your personal information.</p>" +
        (who.length ? "<h2>Services we use</h2><ul>" + who.join("") + "</ul><p>Each of these services handles your information under its own privacy policy.</p>" : "") +
        "<h2>How long we keep it</h2><p>We keep your information only as long as we need it for the purposes above or as required by law.</p>" +
        "<h2>Your choices</h2><p>You can ask us to see, correct, or delete the personal information we have about you by contacting " + contact + ".</p>" +
        "<h2>Children</h2><p>This website is not directed to children under 13, and we don’t knowingly collect their information.</p>",
      terms: "<p>By using this website, you agree to these terms.</p>" +
        "<h2>Our services</h2><p>Service descriptions and prices on this site are for general information and may change. Final prices are confirmed at booking or checkout.</p>" +
        ((on(st, "booking") || on(st, "store") || on(st, "payments")) ? "<h2>Bookings and purchases</h2><p>Appointments and orders are subject to availability" + (st.policies && st.policies.refund ? " and to our <a href=\"refund-policy.html\">Cancellation &amp; Refund Policy</a>" : "") + ".</p>" : "") +
        "<h2>Using this site</h2><p>Please don’t misuse the site, try to break its security, or copy its content for commercial use without permission. Text, photos, and logos belong to " + b + " or are used with permission.</p>" +
        (on(st, "assistant") ? "<h2>Chat assistant</h2><p>The chat assistant is an automated AI helper. Its answers are general information and may not always be complete; please confirm details with us directly.</p>" : "") +
        "<h2>Links to other sites</h2><p>We may link to other websites, such as booking or payment providers. We aren’t responsible for their content or practices.</p>" +
        "<h2>Disclaimer</h2><p>This website is provided “as is.” To the extent allowed by law, " + b + " isn’t liable for indirect or incidental damages from using it.</p>" +
        "<h2>Governing law</h2><p>These terms are governed by the laws of " + law + ".</p>",
      refund: "<h2>Cancellations</h2><p>Please cancel or reschedule at least <b>" + esc(st.cancelHours || 24) + " hours</b> before your appointment so we can offer the time to someone else.</p>" +
        (st.depositText ? "<h2>Deposits</h2><p>" + esc(st.depositText) + "</p>" : "") +
        "<h2>Late arrivals and no-shows</h2><p>" + esc(st.noShowText || "If you arrive late, we may need to shorten or reschedule your appointment. Missed appointments without notice may require a deposit to book again.") + "</p>" +
        "<h2>Refunds</h2><p>" + esc(st.refundText || "If you’re not happy with a service, contact us within 7 days and we’ll work with you to make it right.") + "</p>" +
        (on(st, "store") ? "<h2>Product returns</h2><p>" + esc(st.returnText || "Unopened products can be returned within 14 days of purchase with proof of purchase. Opened products can’t be returned for hygiene reasons unless they arrived damaged.") + "</p>" : ""),
      cookies: "<p>Cookies are small files a website saves in your browser.</p><h2>Our cookies</h2><p>This website doesn’t use advertising or tracking cookies of its own" + (on(st, "assistant") ? ". The chat assistant keeps your conversation only while the page is open" : "") + ".</p>" +
        (who.length ? "<h2>Third-party services</h2><p>Some features on this site come from other companies and may set their own cookies when you use them:</p><ul>" + who.join("") + "</ul>" : "") +
        "<h2>Managing cookies</h2><p>You can block or delete cookies in your browser settings. Some features, like booking or checkout, may not work without them.</p>",
      accessibility: "<p>" + b + " wants everyone to be able to use this website.</p><h2>What we do</h2><ul><li>Readable text and color contrast</li><li>Descriptive labels on forms and images</li><li>Pages that work with a keyboard and on phones</li></ul>" +
        "<h2>Need help?</h2><p>If anything on this site is hard to use, contact us at " + contact + " and we’ll help you another way, such as booking by phone.</p>"
    };
    return '<section class="sec"><div class="wrap narrow legal"><p class="fine">Last updated ' + esc(date) + "</p>" + T[key] +
      "<h2>Contact</h2><p>Questions about this policy? Contact " + b + " at " + contact + ".</p></div></section>";
  }

  /* ---------------- Shared CSS + JS ---------------- */
  function css(st) {
    var s = STYLES[st.style] || STYLES.elegant, c = st.colors || {};
    var primary = c.primary || "#1f3b73", accent = c.accent || "#c9a227", bg = c.bg || "#fbf8f3", ink = c.ink || "#1d1d1f";
    return ":root{--primary:" + primary + ";--accent:" + accent + ";--bg:" + bg + ";--ink:" + ink + ";--muted:color-mix(in srgb,var(--ink) 65%,var(--bg));--soft:color-mix(in srgb,var(--primary) 7%,var(--bg));--line:color-mix(in srgb,var(--ink) 12%,var(--bg));--radius:" + s.radius + ";--card:#fff;--head:'" + s.head + "',Georgia,serif;--body:'" + s.body + "',system-ui,sans-serif}\n" +
      "*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}\n" +
      "img{max-width:100%;display:block}a{color:var(--primary)}h1,h2,h3{font-family:var(--head);font-weight:" + s.headWeight + ";line-height:1.15;margin:0 0 .5em;letter-spacing:-.01em" + (s.upper ? ";text-transform:uppercase" : "") + "}h1{font-size:clamp(2.2rem,5.5vw,3.8rem)}h2{font-size:clamp(1.6rem,3.4vw,2.4rem)}h3{font-size:1.2rem}\n" +
      ".wrap{max-width:1140px;margin:0 auto;padding:0 20px}.narrow{max-width:760px}.center{text-align:center}.fine{font-size:.85rem;color:var(--muted)}.lead{font-size:1.15rem;color:var(--muted);max-width:680px}\n" +
      ".skip{position:absolute;left:-9999px}.skip:focus{left:12px;top:12px;background:#fff;padding:8px 12px;z-index:100}\n" +
      ".hdr{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}.hdr .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:70px}\n" +
      ".logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-family:var(--head);font-size:1.35rem;font-weight:" + s.headWeight + "}.logo img{height:44px;width:auto}\n" +
      ".nav{display:flex;align-items:center;gap:22px}.nav a{color:var(--ink);text-decoration:none;font-weight:600;font-size:.95rem}.nav a.btn{color:#fff}.nav a.btn:hover{color:#fff}.nav a:hover,.nav a[aria-current]{color:var(--primary)}.menu-btn{display:none;background:none;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font:inherit;cursor:pointer;color:var(--ink)}\n" +
      "@media(max-width:860px){.menu-btn{display:block}.nav{display:none;position:absolute;top:70px;left:0;right:0;flex-direction:column;align-items:stretch;gap:0;background:var(--bg);border-bottom:1px solid var(--line);padding:8px 20px 18px}.nav.open{display:flex}.nav a{padding:12px 0;border-bottom:1px solid var(--line)}.nav .btn{margin-top:12px;text-align:center}}\n" +
      ".btn{display:inline-block;background:var(--primary);color:#fff;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:var(--radius);border:2px solid var(--primary);cursor:pointer;font:inherit;font-weight:700;transition:transform .15s,box-shadow .15s}.btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px color-mix(in srgb,var(--primary) 25%,transparent)}\n" +
      ".btn-sm{padding:8px 16px;font-size:.9rem;margin-top:10px}.btn-ghost{background:transparent;color:var(--primary)}.btn-light{background:#fff;color:var(--primary);border-color:#fff}.btn-outline-light{background:transparent;color:#fff;border-color:#fff}.btn-row{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:22px}\n" +
      ".hero{position:relative;padding:clamp(80px,14vw,160px) 0;color:#fff;background:var(--primary) center/cover no-repeat}.hero::before{content:'';position:absolute;inset:0;background:linear-gradient(100deg,rgba(0,0,0,.62),rgba(0,0,0,.25))}.hero .wrap{position:relative}.hero p{font-size:1.2rem;max-width:620px;opacity:.95}.hero .btn-row{justify-content:flex-start}\n" +
      ".eyebrow{display:inline-block;font-size:.8rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:12px}\n" +
      ".phead{padding:clamp(56px,9vw,100px) 0 clamp(36px,6vw,60px);background:var(--soft);border-bottom:1px solid var(--line)}.phead p{color:var(--muted);font-size:1.15rem;max-width:680px;margin:0}\n" +
      ".sec{padding:clamp(52px,8vw,96px) 0}.sec.alt{background:var(--soft)}.sec.band{background:var(--primary);color:#fff}.sec.band h2{color:#fff}.sec.band p{opacity:.92}.sec.band .btn:not(.btn-outline-light){background:#fff;color:var(--primary);border-color:#fff}\n" +
      ".cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin-top:26px}.card{background:var(--card);border:1px solid var(--line);border-radius:calc(var(--radius) + 6px);padding:26px}.card p{margin:0;color:var(--muted)}\n" +
      ".split{display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:start}@media(max-width:860px){.split{grid-template-columns:1fr;gap:28px}}\n" +
      ".ticks{list-style:none;padding:24px 26px;margin:0;background:var(--card);border:1px solid var(--line);border-radius:calc(var(--radius) + 6px)}.ticks li{padding:9px 0 9px 32px;position:relative;border-bottom:1px solid var(--line)}.ticks li:last-child{border:0}.ticks li::before{content:'✓';position:absolute;left:0;color:var(--accent);font-weight:800}\n" +
      ".steps{list-style:none;padding:0;margin:26px 0 0;display:grid;gap:16px}.steps li{display:flex;gap:18px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:calc(var(--radius) + 6px);padding:22px}.steps .num{flex:none;width:40px;height:40px;border-radius:50%;background:var(--primary);color:#fff;display:grid;place-items:center;font-weight:800}.steps p{margin:0;color:var(--muted)}\n" +
      ".faq details{border-bottom:1px solid var(--line);padding:16px 0}.faq summary{cursor:pointer;font-weight:700;font-size:1.05rem}.faq p{color:var(--muted);margin:.6em 0 0}\n" +
      ".menu{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px 32px;margin-top:22px}.menu-item{border-bottom:1px dashed var(--line);padding:14px 0}.mi-top{display:flex;justify-content:space-between;gap:12px;align-items:baseline}.mi-top h3{margin:0;font-size:1.1rem}.mi-price{font-weight:800;color:var(--primary);white-space:nowrap;margin:0}.menu-item p{margin:6px 0 0;color:var(--muted);font-size:.95rem}\n" +
      ".reviews{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin-top:24px}.review{margin:0;background:var(--card);border:1px solid var(--line);border-radius:calc(var(--radius) + 6px);padding:24px}.review blockquote{margin:10px 0 14px;font-size:1.02rem}.review figcaption{font-weight:700}.stars{color:#f5a623;letter-spacing:2px;font-size:1.1rem}.gtag{font-weight:400;font-size:.78rem;color:var(--muted);margin-left:6px}.embed-widget{margin-top:26px}\n" +
      ".gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}.gallery img{aspect-ratio:1;object-fit:cover;width:100%;border-radius:calc(var(--radius) + 4px)}\n" +
      ".products{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:22px}.product{background:var(--card);border:1px solid var(--line);border-radius:calc(var(--radius) + 6px);padding:16px;display:flex;flex-direction:column;gap:6px}.product img,.product .ph{aspect-ratio:1;object-fit:cover;width:100%;border-radius:calc(var(--radius) + 2px);background:var(--soft)}.product h3{margin:8px 0 0}.product p{margin:0;color:var(--muted)}.product .btn{margin-top:auto;text-align:center}\n" +
      ".form{display:grid;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:calc(var(--radius) + 6px);padding:28px}.form label{display:grid;gap:6px;font-weight:600;font-size:.92rem}input,textarea{font:inherit;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:#fff;color:#1d1d1f;width:100%}input:focus,textarea:focus{outline:2px solid var(--primary);outline-offset:1px}.hp{display:none}\n" +
      ".inline-form{display:flex;gap:10px;max-width:480px;margin:20px auto 0}.inline-form input{flex:1}@media(max-width:520px){.inline-form{flex-direction:column}}\n" +
      ".hours{list-style:none;padding:0;margin:0 0 1em}.hours li{display:flex;justify-content:space-between;gap:16px;padding:6px 0;border-bottom:1px solid var(--line);max-width:380px}\n" +
      ".map iframe{width:100%;height:360px;border:0;border-radius:calc(var(--radius) + 6px);margin-top:36px}.book-frame iframe{width:100%;height:760px;border:1px solid var(--line);border-radius:calc(var(--radius) + 6px);background:#fff}\n" +
      ".legal h2{font-size:1.35rem;margin-top:1.6em}.legal li{margin-bottom:.5em}\n" +
      ".ftr{background:color-mix(in srgb,var(--ink) 94%,var(--primary));color:#e9e9ee;padding:56px 0 28px;font-size:.95rem}.ftr a{color:#e9e9ee;text-decoration:none}.ftr a:hover{text-decoration:underline}.ftr-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:28px}@media(max-width:860px){.ftr-grid{grid-template-columns:1fr 1fr}}.ftr h4{font-family:var(--head);margin:0 0 12px;font-size:1.05rem;color:#fff}.ftr ul{list-style:none;padding:0;margin:0}.ftr li{margin:6px 0}.ftr-bottom{border-top:1px solid rgba(255,255,255,.15);margin-top:36px;padding-top:18px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:.82rem;opacity:.8}\n" +
      ".reveal{opacity:0;transform:translateY(16px);transition:opacity .6s ease,transform .6s ease}.reveal.in{opacity:1;transform:none}@media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}html{scroll-behavior:auto}}\n" +
      ".chat-btn{position:fixed;right:18px;bottom:18px;z-index:80;background:var(--primary);color:#fff;border:0;border-radius:999px;padding:14px 20px;font:inherit;font-weight:700;box-shadow:0 10px 28px rgba(0,0,0,.22);cursor:pointer}\n" +
      ".chat{position:fixed;right:18px;bottom:84px;z-index:81;width:min(370px,calc(100vw - 36px));height:min(520px,calc(100vh - 120px));background:#fff;color:#1d1d1f;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden}.chat.open{display:flex}\n" +
      ".chat-h{background:var(--primary);color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;font-weight:700}.chat-h button{background:none;border:0;color:#fff;font-size:1.3rem;cursor:pointer}.chat-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#f7f7f9}\n" +
      ".msg{max-width:85%;padding:9px 13px;border-radius:14px;font-size:.93rem;line-height:1.45;white-space:pre-wrap}.msg.bot{background:#fff;border:1px solid #e6e6ea;align-self:flex-start}.msg.me{background:var(--primary);color:#fff;align-self:flex-end}.chat form{display:flex;gap:8px;padding:10px;border-top:1px solid #eee}.chat form input{flex:1;padding:10px 12px}.chat form button{padding:10px 14px}.chat .note{font-size:.72rem;color:#777;padding:0 12px 8px}\n";
  }
  function js() {
    return "(function(){var b=document.querySelector('.menu-btn'),n=document.querySelector('.nav');if(b&&n)b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o)});\n" +
      "var r=document.querySelectorAll('.reveal');if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});r.forEach(function(e){io.observe(e)})}else r.forEach(function(e){e.classList.add('in')});\n" +
      "var y=document.getElementById('yr');if(y)y.textContent=new Date().getFullYear();\n" +
      "var A=window.SITE_ASSISTANT;if(!A||!A.endpoint)return;var hist=[];\n" +
      "var btn=document.createElement('button');btn.className='chat-btn';btn.type='button';btn.textContent='💬 '+(A.label||'Ask us');\n" +
      "var box=document.createElement('div');box.className='chat';box.setAttribute('role','dialog');box.setAttribute('aria-label','Chat with '+A.name);\n" +
      "box.innerHTML='<div class=\"chat-h\"><span></span><button type=\"button\" aria-label=\"Close chat\">×</button></div><div class=\"chat-log\" aria-live=\"polite\"></div><form><input maxlength=\"500\" placeholder=\"Type your question…\" aria-label=\"Your question\" required><button class=\"btn\" type=\"submit\">Send</button></form><div class=\"note\">AI assistant. Answers may not be perfect, please confirm important details with us.</div>';\n" +
      "box.querySelector('.chat-h span').textContent=A.name;var log=box.querySelector('.chat-log'),f=box.querySelector('form'),inp=f.querySelector('input');\n" +
      "function add(t,who){var m=document.createElement('div');m.className='msg '+who;m.textContent=t;log.appendChild(m);log.scrollTop=log.scrollHeight;return m}\n" +
      "add(A.greeting||'Hi! How can I help?','bot');btn.onclick=function(){box.classList.toggle('open');if(box.classList.contains('open'))inp.focus()};box.querySelector('.chat-h button').onclick=function(){box.classList.remove('open')};\n" +
      "f.onsubmit=function(e){e.preventDefault();var q=inp.value.trim();if(!q)return;inp.value='';add(q,'me');var w=add('…','bot');\n" +
      "fetch(A.endpoint,{method:'POST',headers:{'content-type':'application/json',apikey:A.key,authorization:'Bearer '+A.key},body:JSON.stringify({site:A.site,message:q,history:hist})})\n" +
      ".then(function(r){return r.json()}).then(function(d){var a=(d&&d.reply)||'Sorry, something went wrong. Please use the contact page.';w.textContent=a;hist.push({role:'user',text:q},{role:'assistant',text:a});hist=hist.slice(-8)})\n" +
      ".catch(function(){w.textContent='Sorry, I can’t connect right now. Please use the contact page.'})};\n" +
      "document.body.appendChild(box);document.body.appendChild(btn)})();\n";
  }

  /* ---------------- Page shell ---------------- */
  function shell(st, page, body, opt, nav, footer) {
    var s = STYLES[st.style] || STYLES.elegant;
    var title = page.type === "home" ? st.business + (st.tagline ? " | " + st.tagline : "") : page.title + " | " + st.business;
    var desc = page.meta || st.tagline || st.business;
    var base = opt.baseUrl ? opt.baseUrl.replace(/\/?$/, "/") : "";
    var canon = base ? base + (page.file === "index.html" ? "" : page.file) : "";
    var assets = opt.inline ? "<style>" + css(st) + "</style>" : '<link rel="stylesheet" href="assets/site.css">';
    var script = opt.inline ? "<script>" + js() + "<\/script>" : '<script src="assets/site.js" defer><\/script>';
    var assistant = "";
    if (on(st, "assistant") && opt.assistant && opt.assistant.endpoint) {
      assistant = "<script>window.SITE_ASSISTANT=" + JSON.stringify({
        endpoint: opt.assistant.endpoint, key: opt.assistant.key, site: st.slug,
        name: st.assistantName || (st.business + " Assistant"), label: st.assistantLabel || "Ask us", greeting: st.assistantGreeting || ""
      }).replace(/</g, "\\u003c") + "<\/script>";
    }
    var ld = "";
    if (page.type === "home") {
      var org = { "@context": "https://schema.org", "@type": "LocalBusiness", name: st.business };
      if (st.phone) org.telephone = st.phone; if (st.address) org.address = st.address; if (base) org.url = base;
      if (st.logoUrl) org.logo = st.logoUrl; if (st.heroUrl) org.image = st.heroUrl;
      ld = '<script type="application/ld+json">' + JSON.stringify(org).replace(/</g, "\\u003c") + "<\/script>";
    }
    return "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
      "<title>" + esc(title) + "</title>\n<meta name=\"description\" content=\"" + esc(desc) + "\">\n" +
      (canon ? '<link rel="canonical" href="' + esc(canon) + '">\n' : "") +
      '<meta property="og:title" content="' + esc(title) + '">\n<meta property="og:description" content="' + esc(desc) + '">\n' +
      (st.heroUrl ? '<meta property="og:image" content="' + esc(st.heroUrl) + '">\n' : "") +
      (st.logoUrl ? '<link rel="icon" href="' + esc(st.logoUrl) + '">\n' : "") +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '<link href="https://fonts.googleapis.com/css2?' + s.fonts + '&display=swap" rel="stylesheet">\n' + assets + "\n" + ld + "\n</head>\n<body>\n" +
      '<a class="skip" href="#main">Skip to content</a>\n' + nav(page) + '\n<main id="main">\n' + body + "\n</main>\n" + footer + "\n" + assistant + script + "\n</body>\n</html>\n";
  }

  /* ---------------- Build the whole site ---------------- */
  function generate(st, content, opt) {
    opt = opt || {}; content = content || {};
    var date = opt.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    var pages = (st.pages || []).slice(0, 35).map(function (p) {
      var file = p.type === "home" ? "index.html" : (p.slug || slugify(p.title)) + ".html";
      return { id: p.id, title: p.title || (PAGE_TYPES[p.type] || PAGE_TYPES.custom).label, type: p.type || "custom", brief: p.brief || "", inNav: !!p.inNav, file: file };
    });
    if (!pages.some(function (p) { return p.type === "home"; })) pages.unshift({ id: "home", title: "Home", type: "home", inNav: true, file: "index.html" });
    // Make file names unique.
    var used = {};
    pages.forEach(function (p) { var f = p.file, n = 2; while (used[f]) f = p.file.replace(/\.html$/, "-" + (n++) + ".html"); used[f] = 1; p.file = f; });
    var pols = Object.keys(POLICIES).filter(function (k) { return st.policies && st.policies[k]; }).map(function (k) {
      return { id: "policy-" + k, title: POLICIES[k].title, type: "policy", key: k, file: POLICIES[k].slug + ".html" };
    });

    var bookOn = on(st, "booking") && safeUrl(st.bookingUrl);
    var bookPage = pages.filter(function (p) { return p.type === "booking"; })[0];
    var contactPage = pages.filter(function (p) { return p.type === "contact"; })[0];
    var ctaHref = bookOn && bookPage ? bookPage.file : contactPage ? contactPage.file : "";
    var ctaText = bookOn && bookPage ? "Book now" : "Contact us";
    var svcPage = pages.filter(function (p) { return p.type === "services"; })[0];
    LINKS = { book: bookPage ? bookPage.file : "", contact: contactPage ? contactPage.file : "", services: svcPage ? svcPage.file : "" };
    var navPages = pages.filter(function (p) { return p.inNav && p.file !== ctaHref; }).slice(0, 7);

    function nav(cur) {
      var brand = st.logoUrl ? '<img src="' + esc(st.logoUrl) + '" alt="' + esc(st.business) + ' logo">' + (st.showNameWithLogo ? "<span>" + esc(st.business) + "</span>" : "") : "<span>" + esc(st.business) + "</span>";
      return '<header class="hdr"><div class="wrap"><a class="logo" href="index.html">' + brand + "</a>" +
        '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav">Menu</button><nav class="nav" id="nav" aria-label="Main">' +
        navPages.map(function (p) { return '<a href="' + p.file + '"' + (p.file === cur.file ? ' aria-current="page"' : "") + ">" + esc(p.title) + "</a>"; }).join("") +
        (ctaHref ? '<a class="btn" href="' + ctaHref + '">' + ctaText + "</a>" : "") + "</nav></div></header>";
    }
    var soc = [["Instagram", st.instagram, "https://instagram.com/"], ["Facebook", st.facebook, "https://facebook.com/"], ["TikTok", st.tiktok, "https://tiktok.com/@"]]
      .filter(function (x) { return x[1]; }).map(function (x) { var v = String(x[1]).trim(); var u = /^https?:/.test(v) ? v : x[2] + v.replace(/^@/, ""); return '<li><a href="' + esc(u) + '" target="_blank" rel="noopener">' + x[0] + "</a></li>"; }).join("");
    var footer = '<footer class="ftr"><div class="wrap"><div class="ftr-grid"><div><h4>' + esc(st.business) + "</h4>" +
      (st.tagline ? "<p>" + esc(st.tagline) + "</p>" : "") + (st.address ? "<p>" + esc(st.address) + "</p>" : "") +
      (st.phone ? '<p><a href="' + telHref(st.phone) + '">' + esc(st.phone) + "</a></p>" : "") + (st.email ? '<p><a href="mailto:' + esc(st.email) + '">' + esc(st.email) + "</a></p>" : "") + "</div>" +
      "<div><h4>Pages</h4><ul>" + pages.map(function (p) { return '<li><a href="' + p.file + '">' + esc(p.title) + "</a></li>"; }).join("") + "</ul></div>" +
      (pols.length ? "<div><h4>Policies</h4><ul>" + pols.map(function (p) { return '<li><a href="' + p.file + '">' + esc(p.title) + "</a></li>"; }).join("") + "</ul></div>" : "<div></div>") +
      (soc ? "<div><h4>Follow</h4><ul>" + soc + "</ul></div>" : "<div></div>") + "</div>" +
      '<div class="ftr-bottom"><span>© <span id="yr"></span> ' + esc(st.business) + ". All rights reserved.</span>" +
      (st.credit !== false ? '<span>Website by <a href="https://projectsarae.site" target="_blank" rel="noopener">Project Sarae</a></span>' : "") + "</div></div></footer>";

    var files = {};
    pages.forEach(function (p) {
      var c = content[p.id] && content[p.id].hero ? content[p.id] : fallback(st, p);
      p.meta = c.meta_description;
      var hero = c.hero || {};
      var body = "";
      if (p.type === "home") {
        body += '<section class="hero"' + (st.heroUrl ? ' style="background-image:url(\'' + esc(st.heroUrl).replace(/'/g, "%27") + "')\"" : "") + '><div class="wrap">' +
          (hero.eyebrow ? '<span class="eyebrow">' + esc(hero.eyebrow) + "</span>" : "") + "<h1>" + esc(hero.title || st.business) + "</h1>" +
          (hero.sub ? "<p>" + esc(hero.sub) + "</p>" : "") + '<div class="btn-row">' + (ctaHref ? '<a class="btn btn-light" href="' + ctaHref + '">' + ctaText + "</a>" : "") +
          (st.phone ? '<a class="btn btn-outline-light" href="' + telHref(st.phone) + '">Call us</a>' : "") + "</div></div></section>";
      } else {
        body += '<section class="phead"><div class="wrap">' + (hero.eyebrow ? '<span class="eyebrow">' + esc(hero.eyebrow) + "</span>" : "") +
          "<h1>" + esc(hero.title || p.title) + "</h1>" + (hero.sub ? "<p>" + esc(hero.sub) + "</p>" : "") + "</div></section>";
      }
      var secs = (Array.isArray(c.sections) ? c.sections : []).map(sectionHtml).join("");
      switch (p.type) {
        case "home": body += secs + servicesBlock(st, 6) + reviewsBlock(st, true) + galleryBlock(st, 6) + leadBlock(st) + ctaBand(st); break;
        case "services": body += secs + servicesBlock(st) + paymentsBlock(st) + ctaBand(st); break;
        case "about": body += secs + galleryBlock(st, 3) + ctaBand(st); break;
        case "contact": body += secs + contactBlock(st) + leadBlock(st); break;
        case "booking": body += bookingBlock(st) + secs; break;
        case "reviews": body += reviewsBlock(st, false) + secs; break;
        case "gallery": body += galleryBlock(st) + secs; break;
        case "store": body += storeBlock(st) + secs; break;
        case "members": body += membersBlock(st) + secs; break;
        default: body += secs + ctaBand(st);
      }
      files[p.file] = shell(st, p, body, opt, nav, footer);
    });
    pols.forEach(function (p) {
      p.meta = p.title + " for " + st.business + ".";
      var body = '<section class="phead"><div class="wrap"><h1>' + esc(p.title) + "</h1></div></section>" + policyBody(st, p.key, date);
      files[p.file] = shell(st, p, body, opt, nav, footer);
    });
    if (!opt.inline) {
      files["assets/site.css"] = css(st);
      files["assets/site.js"] = js();
      files["404.html"] = shell(st, { title: "Page not found", type: "custom", file: "404.html", meta: "Page not found" },
        '<section class="sec"><div class="wrap narrow center"><h1>Page not found</h1><p>That page doesn’t exist anymore.</p><p class="btn-row"><a class="btn" href="index.html">Go to the homepage</a></p></div></section>', opt, nav, footer);
      files[".nojekyll"] = "";
      var base = opt.baseUrl ? opt.baseUrl.replace(/\/?$/, "/") : "";
      files["robots.txt"] = "User-agent: *\nAllow: /\n" + (base ? "Sitemap: " + base + "sitemap.xml\n" : "");
      if (base) files["sitemap.xml"] = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        pages.concat(pols).map(function (p) { return "  <url><loc>" + esc(base + (p.file === "index.html" ? "" : p.file)) + "</loc></url>"; }).join("\n") + "\n</urlset>\n";
      if (st.domain) files["CNAME"] = String(st.domain).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") + "\n";
    }
    return { files: files, pages: pages, policies: pols };
  }

  root.PSBuilder = { generate: generate, assistantInfo: assistantInfo, slugify: slugify, PAGE_TYPES: PAGE_TYPES, POLICIES: POLICIES, STYLES: STYLES };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PSBuilder;
})(typeof window !== "undefined" ? window : globalThis);
