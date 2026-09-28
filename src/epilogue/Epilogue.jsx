// After close: the house menu (pricing), who it's for, and the footer. Ordinary page flow from here on.
import { useState } from 'react'
import { Logo } from '../ui/Header.jsx'
import { LINKS } from '../ui/assets.js'

const PLANS = [
  {
    kicker: 'Works with your current POS',
    name: 'Shire Intelligence',
    price: 'Starting at $150',
    per: '/ month',
    line: "Add Shire's live floor intelligence without replacing the systems you already use.",
    items: ['CCTV-powered host optimization', 'Live server and busser alerts', 'Automated staff scheduling', 'AI operations assistant', 'Staff efficiency analytics'],
    cta: 'Get started',
  },
  {
    kicker: 'Complete operating system',
    name: 'Shire POS',
    price: 'Free install',
    line: 'Bring payments, service, staffing, and restaurant operations into one connected system.',
    items: ['Everything in Shire Intelligence', 'Point of sale and reservations', 'Lower transaction fees', 'Menu pricing recommendations', 'Marketing, loyalty, and reviews'],
    cta: 'Try Shire free',
    feature: true,
  },
  {
    kicker: 'For multi-location groups',
    name: 'Shire Enterprise',
    price: 'Custom',
    line: 'Tailored infrastructure, analytics, and support for growing restaurant organizations.',
    items: ['Everything in Shire POS', 'Custom data migration', 'Advanced onboarding', 'AI marketing engine', 'Kitchen optimization software'],
    cta: 'Contact sales',
  },
]

const TYPES = ['Full Service', 'Quick Service', 'Bar & Lounge', 'Pizzeria', 'Bakery', 'Drive-Thru', 'Fast Casual', 'Food Truck', 'Fine Dining', 'Hotel Restaurant']

export function Epilogue() {
  const [aud, setAud] = useState('owner')
  return (
    <div className="after" id="after-close">
      <section className="menu-sec" id="pricing" aria-labelledby="pricing-h">
        <div className="menu-card">
          <header className="menu-head">
            <p className="eyebrow eyebrow-ink">The house menu</p>
            <h2 id="pricing-h" className="menu-title">
              Simple plans for serious growth.
            </h2>
            <ul className="menu-perks">
              <li>24/7 support</li>
              <li>
                Offline mode
                <span className="menu-tip" role="note">
                  If internet or network service is disrupted, Shire's offline mode keeps orders, kitchen tickets, receipts, and supported card payments moving until the connection returns.
                </span>
              </li>
              <li>Quick setup</li>
            </ul>
            <div className="menu-toggle" role="tablist" aria-label="Pricing audience">
              <button role="tab" aria-selected={aud === 'owner'} className={aud === 'owner' ? 'is-on' : ''} onClick={() => setAud('owner')}>
                Owner
              </button>
              <button role="tab" aria-selected={aud === 'reseller'} className={aud === 'reseller' ? 'is-on' : ''} onClick={() => setAud('reseller')}>
                Reseller
              </button>
            </div>
          </header>
          {aud === 'owner' ? (
            <ol className="menu-list">
              {PLANS.map((p) => (
                <li key={p.name} className={`course ${p.feature ? 'is-feature' : ''}`}>
                  <p className="course-kicker">{p.kicker}</p>
                  <div className="course-line">
                    <h3>{p.name}</h3>
                    <span className="course-dots" aria-hidden="true" />
                    <p className="course-price">
                      {p.price}
                      {p.per && <small> {p.per}</small>}
                    </p>
                  </div>
                  <p className="course-desc">{p.line}</p>
                  <ul className="course-items">
                    {p.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                  <a className={`btn ${p.feature ? '' : 'btn-ink-ghost'}`} href={LINKS.demo}>
                    {p.cta}
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <div className="reseller">
              <p className="course-kicker">For technology and regional partners</p>
              <h3 className="menu-title menu-title-sm">Bring Shire to your market.</h3>
              <p className="course-desc">Access preferred Datacap and PayBright rates, protected regional product opportunities, and flexible reseller economics with room to build margin.</p>
              <ul className="course-items">
                <li>Preferred processing rates</li>
                <li>Regional product exclusivity</li>
                <li>Flexible reseller markup</li>
                <li>Sales and onboarding support</li>
              </ul>
              <a className="btn" href={LINKS.demo}>
                Connect with our team
              </a>
            </div>
          )}
          <div className="menu-savings">
            <p>See how much you could save with Shire.</p>
            <a className="link-arrow link-ink" href={LINKS.savings}>
              Calculate savings
            </a>
          </div>
        </div>
      </section>

      <section className="types" aria-labelledby="types-h">
        <h2 id="types-h" className="types-title">
          Built for the way you serve.
        </h2>
        <p className="types-lede">From full-service dining to drive-thru, Shire adapts to the pace, staffing, and workflow of every food business.</p>
        <ul className="types-list">
          {TYPES.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <a className="btn btn-lg btn-ink" href={LINKS.demo}>
          Get a demo
        </a>
      </section>

      <footer className="foot">
        <div className="foot-brand">
          <Logo className="logo-ink" />
          <p>Your personal restaurant operations system</p>
          <p className="foot-programs">Y Combinator · NVIDIA Inception</p>
        </div>
        <nav className="foot-col" aria-label="Pages">
          <h3>Pages</h3>
          <a href="https://shireintelligence.com/">Home</a>
          <a href="#pricing">Pricing</a>
          <a href={LINKS.savings}>Benefits</a>
          <a href={LINKS.video}>See Shire in action</a>
        </nav>
        <address className="foot-col">
          <h3>Contact</h3>
          <span>Alex Tabaku</span>
          <a href="mailto:alex@shireintelligence.com">alex@shireintelligence.com</a>
          <a href="tel:+18435828486">843-582-8486</a>
          <span>174 Beach Dr SC</span>
        </address>
        <nav className="foot-col" aria-label="Legal and social">
          <h3>Legal</h3>
          <a href={LINKS.privacy}>Privacy</a>
          <a href={LINKS.terms}>Terms of use</a>
          <a href={LINKS.linkedin}>LinkedIn</a>
          <a href={LINKS.x}>X</a>
        </nav>
        <p className="foot-copy">© 2026 Shire, Inc.</p>
      </footer>
    </div>
  )
}
