# SUIT Wolverhampton 2026 — Website & CMS

> **Service User Involvement Team** — Wolverhampton's award-winning, lived-experience addiction recovery service. A project of WVCA.

---

## What Is This?

This is the complete 2026 rebuild of the SUIT Wolverhampton website. It includes:

- A beautiful, warm, accessible **public website** designed to feel like a digital sanctuary
- A simple **Admin CMS panel** so non-technical staff can update content, timetables, stories, team members, and media
- **Progressive Web App (PWA)** support — visitors can save it to their phone home screen
- **Quick Exit** safety button for vulnerable users
- **AI Signposting** chat bubble that guides visitors to the right support
- Built-in **accessibility** tools (high contrast, dyslexia font, multi-language translation)

---

## Quick Start

### 1. Install Node.js

Download and install Node.js from [nodejs.org](https://nodejs.org/) (LTS version recommended).

### 2. Install Dependencies

Open a terminal/command prompt in this folder and run:

```bash
npm install
```

### 3. Start the Website

```bash
npm start
```

The website will be available at: **http://localhost:3000**

### 4. Admin Login

Go to: **http://localhost:3000/admin/login**

**Default credentials:**
- Username: `admin`
- Password: `SUITadmin2026!`

> ⚠️ **Change the password immediately** after first login via Admin → Settings.

---

## For Non-Technical Staff: How to Update the Website

### Changing Text on the Homepage

1. Log in to the Admin panel (`/admin/login`)
2. Click **"Edit Content"** in the sidebar
3. Change the headline, phone number, quote, or any text
4. Click **"Save All Changes"**
5. The website updates instantly!

### Updating the Timetable

1. Go to **Admin → Timetable**
2. To add an event: fill in the Day, Time, Title, and Category using the dropdowns, then click "Add Event"
3. To remove an event: click the 🗑️ Delete button next to it
4. Changes are live immediately

### Adding a Story of Hope

1. Go to **Admin → Stories → Add New Story**
2. Fill in the person's name, story title, and the full story text
3. Upload a photo and/or 60-second video
4. Tick "Featured on homepage" if you want it shown on the front page
5. Click **"Save Story"**

### Managing the Team

1. Go to **Admin → Team → Add Team Member**
2. Enter their name, role, short bio, and upload a photo
3. Click **"Save Team Member"**

### Uploading Photos & Videos

1. Go to **Admin → Gallery / Media**
2. Click the upload area and select files (photos or videos)
3. Files are uploaded instantly
4. Use the "Copy URL" button to get the file link

### Reading Contact Form Messages

1. Go to **Admin → Messages**
2. New messages are marked with 🔵
3. Click "Mark Read" once you've responded
4. Click 🗑️ to delete old messages

### Changing Your Password

1. Go to **Admin → Settings**
2. Enter your current password and choose a new one
3. Click "Update Password"

---

## Design System: "Dawn Over Wolverhampton"

The colour palette is derived from the SUIT logo branding:

| Colour         | Hex       | Usage                         |
|----------------|-----------|-------------------------------|
| **Orange**     | `#F7941D` | Primary CTAs, hope, energy    |
| **Cyan Blue**  | `#00AEEF` | Trust, openness               |
| **Green**      | `#8DC63F` | Growth, renewal               |
| **Pink**       | `#EC008C` | Vibrancy, compassion          |
| **Deep Teal**  | `#00707F` | Text, footers, stability      |
| **Soft Cream** | `#FDFBF7` | Background (no harsh white)   |

---

## Website Pages

| Page             | URL           | Description                                |
|------------------|---------------|--------------------------------------------|
| Homepage         | `/`           | Hero, 3 steps, services, timetable snippet |
| Get Help Now     | `/get-help`   | Crisis numbers, map, WhatsApp link         |
| How We Help      | `/services`   | All services explained in plain language    |
| Timetable        | `/timetable`  | Interactive weekly calendar with filters    |
| Stories of Hope  | `/stories`    | Video & text testimonials                  |
| About Us         | `/about`      | Mission, team, get involved                |
| Contact Us       | `/contact`    | Contact form with sunrise animation        |

---

## Tech Stack

- **Server:** Node.js + Express
- **Templates:** EJS (with ejs-mate layouts)
- **Data:** JSON flat-files (no database needed)
- **Uploads:** Multer (images & videos up to 100MB)
- **Auth:** bcryptjs + express-session
- **PWA:** Service Worker + Web App Manifest
- **CSS:** Custom design system, fully responsive
- **Fonts:** Outfit (headings) + Inter (body) via Google Fonts

---

## File Structure

```
SUIT Website/
├── server.js              # Main Express server
├── package.json           # Dependencies & scripts
├── data/                  # JSON content files (the "database")
│   ├── content.json       # Homepage text, contact info, services
│   ├── timetable.json     # Weekly event schedule
│   ├── stories.json       # Stories of Hope
│   ├── team.json          # Team members
│   ├── messages.json      # Contact form submissions
│   └── admin.json         # Admin credentials (auto-generated)
├── public/                # Static files served to browsers
│   ├── css/style.css      # Complete design system
│   ├── js/main.js         # Public-facing JavaScript
│   ├── js/admin.js        # Admin panel JavaScript
│   ├── sw.js              # Service Worker for PWA
│   ├── images/            # Logo, favicon, etc.
│   └── uploads/           # User-uploaded media
│       ├── gallery/
│       ├── stories/
│       ├── team/
│       └── videos/
└── views/                 # EJS templates
    ├── layout.ejs         # Main page layout
    ├── pages/             # Public pages
    ├── partials/          # Header, footer, etc.
    └── admin/             # Admin panel pages
```

---

## Deployment

### Option 1: Simple VPS (Recommended)

1. Upload files to your server
2. Install Node.js
3. Run `npm install` then `npm start`
4. Use PM2 for auto-restart: `npx pm2 start server.js --name suit`
5. Point your domain to the server with Nginx as reverse proxy

### Option 2: Railway / Render / Fly.io

Push to GitHub and connect to any Node.js hosting platform. They'll detect the `package.json` and deploy automatically.

### Option 3: Local Network

Run `npm start` on any computer on your local network. Access from other devices using the computer's IP address (e.g., `http://192.168.1.5:3000`).

---

## Adding the Logo

Place the SUIT logo image file in `public/images/` as:
- `suit-logo.png` (for the header)
- `favicon.png` (for the browser tab icon)
- `icon-192.png` and `icon-512.png` (for PWA home screen icons)

---

## SEO

The site is pre-optimised for local search. Key meta tags are included for:
- "addiction support wolverhampton"
- "drug help near me"
- "alcohol recovery west midlands"
- "peer mentoring wolverhampton"

For best results, register with Google Search Console and submit the sitemap.

---

## Support

For technical help with this website, contact your web developer or raise an issue on the project repository.

**For the people of Wolverhampton:** If you or someone you know needs support, call SUIT on **01902 572 040** or just walk in. No appointment needed.
