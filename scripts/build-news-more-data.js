/**
 * One-off / maintenance: merges editorial stubs with gallery URLs from legacy-media-manifest.json
 * Run: node scripts/build-news-more-data.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'legacy-media-manifest.json'), 'utf8'));

function galleryFor(pagePath, max = 12) {
  const page = manifest.pages.find((p) => p.path === pagePath);
  if (!page || !page.images) return [];
  const skip = (u) =>
    /WVCA_logo|imgg-gi3|Sunburst|Mint-Breeze|Snowy-Mountains|Blueberry-Sky/i.test(u);
  return page.images
    .map((i) => (i.dedupeKey || i.src || '').split('?')[0])
    .filter((u) => u && !skip(u))
    .filter((u, i, a) => a.indexOf(u) === i)
    .slice(0, max)
    .map((src) => ({ src, alt: `SUIT — ${pagePath}` }));
}

const data = {
  hubTitle: 'News & More',
  hubIntro:
    'Publications, podcasts, harm reduction, mental health resources, LEAG, conferences, gallery highlights, announcements, and our vision — the same stories as the legacy site, presented in the new SUIT design.',
  cards: [
    { slug: 'publications', title: 'Publications', description: 'Books, chapters, poetry, and Performing Recovery — including the British Library LERO volume.', icon: 'lucide:book-open', colorClass: 'card-orange' },
    { slug: 'podcasts', title: 'Podcasts & Radio', description: 'Black Country Xtra, Graham Stubbs, research conversations, and BBC Prison Radio.', icon: 'lucide:mic', colorClass: 'card-cyan' },
    { slug: 'swap-to-stop', title: 'Swap to Stop', description: 'Vaping support to become smoke-free with our trained team — eligibility and how to register.', icon: 'lucide:cigarette-off', colorClass: 'card-green' },
    { slug: 'harm-reduction', title: 'Harm Reduction', description: 'Needle exchange, naloxone, safer using resources, and signposting across Wolverhampton.', icon: 'lucide:shield-heart', colorClass: 'card-orange' },
    { slug: 'mental-health-support', title: 'Mental Health Support', description: 'Peer drop-ins, crisis lines, and partners alongside Recovery Near You and the NHS.', icon: 'lucide:brain', colorClass: 'card-cyan' },
    { slug: 'leag', title: 'LEAG', description: 'Lived Experience Advisory Group — shaping services with your voice.', icon: 'lucide:users-round', colorClass: 'card-green' },
    { slug: 'conferences', title: 'Conferences & Events', description: 'Recovery walks, Pride, Favor UK, DDN, literature festivals, and more.', icon: 'lucide:calendar-days', colorClass: 'card-orange' },
    { slug: 'gallery', title: 'Gallery', description: 'Drama, literature festival, Forest Faced, and Asylum Artist Quarter highlights.', icon: 'lucide:images', colorClass: 'card-cyan' },
    { slug: 'announcements', title: 'Announcements', description: 'Latest dates for liver scans, exhibitions, consultations, and community gatherings.', icon: 'lucide:megaphone', colorClass: 'card-green' },
    { slug: 'our-vision', title: 'Our Vision', description: 'How we help, what we offer, volunteering, and strategic involvement as Wolverhampton’s LERO.', icon: 'lucide:eye', colorClass: 'card-orange' }
  ],
  pages: {}
};

// ——— publications ———
data.pages.publications = {
  title: 'Publications',
  heroLead:
    'SUIT in print and film: the British Library LERO book, Saida Chowdhury’s Broken Minds, and Performing Recovery magazine.',
  legacyUrl: 'https://www.suitrecoverywolverhampton.com/publications',
  youtubeIds: ['z-T26ozEx_I'],
  sections: [
    {
      type: 'text',
      title: 'British Library — Lived Experience Recovery Organisations',
      paragraphs: [
        'SUIT were honoured to attend the British Library in London to deposit a groundbreaking new book on addiction and recovery into the national archives, alongside Dame Carol Black.',
        'On Tuesday 20th January, Marcus and Christiane were at the British Library with Dame Carol Black for an incredible milestone in SUIT’s history.',
        'SUIT’s contribution to “Lived Experience Recovery Organisations: Peer Generated Epicentres of Personal Change and Collective Transformation” appears alongside other lived experience testimonies from LERO leaders nationally. The volume was created by Dr David Patton (University of Derby) and Dot Smith of Recovery Connections, who launched New Central Media publishing together.',
        'The event saw the book deposited in the British Library so the work from contributors including SUIT becomes part of the national archive and is recognised as a meaningful contribution to lived experience knowledge.',
        '“This is a significant milestone in the journey of lived experience models of support with regard to recovery from addiction… as part of WVCA, SUIT has been supporting those in recovery for 20 years. To have our work recognised in such a prestigious publication really does validate, not only what we do here in Wolverhampton, but what the LERO movement is achieving nationally.” — Marcus Johnson, SUIT Project Manager',
        '“Since first meeting Dr David Patton at various events, he has championed SUIT and LEROs nationally. We were humbled to be asked to contribute to the important volume.” — Christiane Jenkins, SUIT Creative Arts and Research Lead'
      ],
      links: [
        { label: 'Purchase the book (Amazon)', href: 'https://www.amazon.co.uk/gp/product/B0FSF1RXMD' },
        { label: 'Dr David Patton — profile', href: 'https://www.issup.net/about-issup/acknowledgements/dr-david-patton' },
        { label: 'Recovery Connections — New Central Media', href: 'https://recoveryconnections.org.uk/service/new-central-media/' },
        { label: 'Dr Ed Day — government Recovery Champion', href: 'https://www.gov.uk/government/people/ed-day' },
        { label: 'WVCA', href: 'https://www.wvca.org.uk/' }
      ]
    },
    {
      type: 'quote',
      title: 'About the collection',
      quote:
        'This groundbreaking collection brings together 14 powerful, first-person accounts from leaders of Lived Experience Recovery Organisations (LEROs) transforming the addiction recovery landscape in the UK — a celebration of recovery communities and a manifesto for embedding lived experience into national systems.',
      cite: 'From the publisher’s description'
    },
    {
      type: 'text',
      title: 'Saida Chowdhury — Broken Minds',
      paragraphs: [
        'Congratulations to SUIT champion, poet Saida Chowdhury, who published her debut poetry anthology “Broken Minds”, with cover art by SUIT’s Creative Arts Lead, Christiane.',
        'The work reflects mental health struggles and pushing forward through a system that marginalises Muslim females. Filmmaker Graham Stubbs made a short film about her journey to becoming a published writer.',
        'Reviewers have praised how Saida’s work moves from tough themes to the joy of recovery, love, and faith — written for the stage and powerful on the page.'
      ],
      links: [
        { label: 'Watch Saida’s film (YouTube)', href: 'https://www.youtube.com/watch?v=d147QND9ZVM' },
        { label: 'Broken Minds — Saturday Books', href: 'https://saturdaybooks.co.uk/books/broken-minds/' }
      ]
    },
    {
      type: 'text',
      title: 'Performing Recovery magazine',
      paragraphs: [
        'In 2023, Marcus and Christiane visited Liverpool Hope University for the Addiction-Recovery Arts Futures conference, held by Addiction-Recovery-Arts founders Leon and Alex.',
        'Performing Recovery have supported our mission and published our work in Wolverhampton, putting SUIT on the map for creative practice in recovery.'
      ],
      links: [
        { label: 'Performing Recovery magazine', href: 'https://recovery-arts.org/performing-recovery-magazine/' },
        { label: 'Read and download features', href: 'https://recovery-arts.org/category/features/' }
      ]
    }
  ],
  gallery: galleryFor('/publications', 14)
};

data.pages.podcasts = {
  title: 'Podcasts & Radio',
  heroLead: 'Conversations that celebrate Wolverhampton’s creative recovery community — on air, on demand, and on film.',
  legacyUrl: 'https://www.suitrecoverywolverhampton.com/podcasts',
  sections: [
    {
      type: 'text',
      title: 'Graham Stubbs — We are Wolverhampton',
      paragraphs: [
        '“I’m Graham, I’m a photographer and video maker. I’m working on a project called We are Wolverhampton which celebrates the people and positive things in our city. This podcast captures deeper conversations about what the city means to different individuals.”'
      ],
      links: [{ label: 'We are Wolverhampton — find out more', href: 'https://www.instagram.com/grahamstubbsphoto/' }]
    },
    {
      type: 'text',
      title: 'Research — Dr Elena Vasiliou & Warren Sutherland',
      paragraphs: [
        'A conversation on self-harm and suicide in UK prisons — psychologist and scholar Dr Elena Vasiliou with Warren (SUIT), bringing lived experience of incarceration and addiction. The project is supported by the University of Warwick and funded by the European Commission (project id: 101032854).',
        '“This conversation… challenges clinical narratives of self-destruction and centres the voices of those most directly impacted.” — Dr Elena Vasiliou, 2025'
      ]
    },
    {
      type: 'text',
      title: 'Black Country Xtra — The Suits Show',
      paragraphs: [
        'Thanks to Billy Spakemon (Dr Brian Dakin) and Ian Henery at Black Country Xtra for a regular slot celebrating our lived experience staff, volunteers, and clients who share diverse histories to inspire others. #SUITvoicesofrecovery'
      ],
      links: [{ label: 'Black Country Radio', href: 'https://www.blackcountryradio.co.uk/' }]
    },
    {
      type: 'text',
      title: 'BBC Prison Radio — Outside In',
      paragraphs: [
        'Warren and Marcus visited the BBC studios in London in May 2025 with producer Maria Margaronis. Warren spoke about how the arts have supported his criminal justice history, recovery, and resettlement after many years in prison.'
      ],
      links: [{ label: 'BBC Prison Radio — learn more', href: 'https://www.nationalprisonradio.com/' }]
    }
  ],
  gallery: galleryFor('/podcasts', 10)
};

// swap to stop — new-page-1
data.pages['swap-to-stop'] = {
  title: 'Swap to Stop',
  heroLead: 'A Public Health scheme to reduce harm from smoking — vapes and supplies over 12 weeks, delivered with SUIT support.',
  legacyUrl: 'https://www.suitrecoverywolverhampton.com/new-page-1',
  sections: [
    {
      type: 'notice',
      title: 'Eligibility',
      paragraphs: [
        'To be eligible you must be a current smoker, aged 18 or over, and meet medical requirements discussed with your advisor.',
        'Swap to Stop is delivered by Public Health to reduce harm, illness, and deaths caused by smoking.'
      ]
    },
    {
      type: 'text',
      title: 'SUIT team trained to deliver Swap to Stop',
      paragraphs: [
        'Cody Jenkins (Data Illustrator), Jason Spreckley (Outreach Lead), and Fallon Burnett (Project Support Worker & Shared Care Lead).',
        'The scheme has successfully supported over 100 people to become smoke-free.',
        'Get in touch with one of our team to arrange a consultation.'
      ],
      links: [{ label: 'Recovery Near You', href: 'https://www.recoverynearyou.org.uk/' }]
    },
    {
      type: 'notice',
      title: 'Important — GP consent',
      paragraphs: [
        'If you take any of the medications below, your doctor’s consent is needed before you can receive a vape.'
      ],
      items: [
        'Theophylline',
        'Adrenergic agonists & antagonists',
        'Fluvoxamine',
        'Clozapine',
        'Clomipramine',
        'Imipramine',
        'Olanzapine',
        'Flecainide',
        'Pentazocine'
      ],
      links: [{ label: 'Download GP consent form (legacy site)', href: 'https://www.suitrecoverywolverhampton.com/new-page-1' }]
    }
  ],
  gallery: galleryFor('/new-page-1', 6)
};

// harm reduction — new-page-2 (condensed; legacy has full pharmacy table)
data.pages['harm-reduction'] = {
  title: 'Harm Reduction',
  heroLead: 'Needle exchange, naloxone, safer using information, and advocacy with Recovery Near You and Public Health.',
  legacyUrl: 'https://www.suitrecoverywolverhampton.com/new-page-2',
  sections: [
    {
      type: 'text',
      title: 'Needle & Syringe Programme',
      paragraphs: [
        'SUIT are committed alongside Recovery Near You and Public Health to ensure people who inject drugs receive fair, supportive, non-judgemental and risk-reducing interventions in Wolverhampton.',
        'We produce an annual Needle Exchange report for Public Health. For information about this process, email jason.spreckley@wvca.org.uk.',
        'If you are an injecting drug user in Wolverhampton and would like to contribute feedback, please contact us — your answers are confidential.'
      ],
      links: [
        { label: 'Service User Perspectives on Safer Injecting Facilities (Drug Science, 2024)', href: 'https://www.suitrecoverywolverhampton.com/new-page-2' },
        { label: 'Recovery Near You', href: 'https://www.recoverynearyou.org.uk/' }
      ]
    },
    {
      type: 'text',
      title: 'Pharmacies offering needle exchange in Wolverhampton',
      subtitle: 'Selected locations — see legacy page for the full current list.',
      items: [
        'Boots UK — 40-41 Dudley Street WV1 3NN — 01902 427145',
        'Ettingshall Pharmacy — 3 New Street WV2 2LR — 01902 490191',
        'Heath Town Pharmacy — 181 Wednesfield Road WV10 0EN — 01902 456286',
        'High Street Pharmacy — 76 High Street Bilston WV14 0EP — 01902 495225',
        'Hingley Pharmacy — 179 Lea Road WV3 0LG — 01902 421132',
        'Murrays Health Centre — 128 Childs Avenue Coseley WV14 9XB — 01902 883711',
        'Recovery Near You — Pitt Street WV3 0NF — 0300 200 2400',
        'Whitmore Reans Pharmacy — Avion Centre,6 Bargate Drive WV6 0QW — 01902 713123'
      ]
    },
    {
      type: 'text',
      title: 'Naloxone',
      paragraphs: [
        'Naloxone is an opioid antagonist that can reverse overdose from heroin and other opioids. It can be obtained from drug treatment clinics such as Recovery Near You. Naloxone does not intoxicate, and anyone can administer it in an emergency.'
      ],
      links: [{ label: 'Overdose and naloxone guidance (legacy downloads)', href: 'https://www.suitrecoverywolverhampton.com/new-page-2' }]
    },
    {
      type: 'text',
      title: 'Further harm reduction resources',
      paragraphs: [
        'New psychoactive substances, chemsex awareness, The Loop drug alerts, Bristol Drugs Project (The Drop), and Transform Drug Policy Foundation — all linked from our legacy page with downloadable leaflets.'
      ],
      links: [
        { label: 'Full legacy page with downloads', href: 'https://www.suitrecoverywolverhampton.com/new-page-2' },
        { label: 'Terrence Higgins Trust — Chemsex resources', href: 'https://www.tht.org.uk/' }
      ]
    }
  ],
  gallery: galleryFor('/new-page-2', 10)
};

// mental health — new-page-3
data.pages['mental-health-support'] = {
  title: 'Mental Health Support',
  heroLead: 'SUIT alongside Recovery Near You, Black Country Healthcare NHS Foundation Trust, and city partners for mental health and co-occurring substance use.',
  legacyUrl: 'https://www.suitrecoverywolverhampton.com/new-page-3',
  sections: [
    {
      type: 'text',
      title: 'Mental Health Peer Support Drop-Ins',
      paragraphs: [
        'A safe space for support, advice, and community links — health and wellbeing, advocacy, housing, welfare, education and training, employment, activities and groups, addiction and recovery, mental health, and peer-led initiatives.',
        'Workshops are often themed, delivered by SUIT, the Good Shepherd, One Wolverhampton, Wolverhampton City Council Public Health, Rethink, and the NHS.',
        'First Friday of every month, 10am–12pm, at Train Station Hub WV1 1LE (next door to Costa Coffee).'
      ]
    },
    {
      type: 'text',
      title: 'Suicide prevention & bereavement support',
      items: [
        'Black Country 24/7 Urgent Mental Health Helpline — 0800 008 6516 — text 07860 025281',
        'NHS 111 Option 2 — urgent mental health support; text 07860 025 281',
        'Shout — text TeamKPG to 85258 (Kaleidoscope Plus Group)',
        'Kaleidoscope Plus — Midlands Suicide Bereavement Support Group, monthly Tuesdays 10:30am–12:20pm at Hope Place B70 8LU — 0121 565 5605'
      ],
      links: [{ label: 'Kaleidoscope Plus — contact', href: 'https://www.kaleidoscopeplus.org.uk/contact/' }]
    }
  ],
  gallery: galleryFor('/new-page-3', 8)
};

// LEAG
data.pages.leag = {
  title: 'LEAG — Lived Experience Advisory Group',
  heroLead: 'Your voice in how drug and alcohol support is shaped — quarterly forums with commissioners and partners.',
  legacyUrl: 'https://www.suitrecoverywolverhampton.com/leag',
  sections: [
    {
      type: 'text',
      title: 'Quarterly meeting',
      paragraphs: [
        'People affected by addiction, mental health, housing, and poverty have often been excluded from decisions about healthcare, treatment, and risk. LEAG exists so lived and living experience is heard and acted on.',
        'We work with Recovery Near You and Wolverhampton Public Health’s Drug and Alcohol Commissioner. The quarterly LEAG meeting is for clients and volunteers who shape our recovery work — face-to-face, supported by a lived-experience member of the SUIT team.',
        'To join LEAG, email christiane.jenkins@wvca.org.uk or jason.spreckley@wvca.org.uk.'
      ]
    },
    {
      type: 'text',
      title: 'Spring LEAG — thank you',
      paragraphs: [
        'Thank you to everyone who attended the spring LEAG on Thursday 5th March, and to the Good Shepherd for hospitality. Thanks to Angie and Karl from Recovery Near You and Stuart from One Wolverhampton NHS ICB for answering questions and strengthening partnerships.',
        'We celebrated volunteers progressing through our Recovery Ambassador programme — without you, this work is not possible.'
      ]
    },
    {
      type: 'text',
      title: '“You said, we did”',
      items: [
        'Buddy support',
        'Men’s Group responding to needs — gym, sports, health and wellbeing',
        'SUIT visible through Relapse Prevention, BEI, Pre Hab',
        'Website as core information base',
        'New leaflets and volunteer programme',
        'Dual diagnosis enhanced model',
        'Aftercare — new vision and model planned'
      ]
    }
  ],
  gallery: galleryFor('/leag', 14)
};

// conferences
data.pages.conferences = {
  title: 'Conferences & Events',
  heroLead: 'From national recovery conferences and Pride to literature festivals and tattoo conventions — SUIT out in the community.',
  legacyUrl: 'https://www.suitrecoverywolverhampton.com/conferences',
  sections: [
    {
      type: 'text',
      title: 'Favor UK National Recovery Conference 2025',
      paragraphs: [
        'Our team at Molineux for the Favor UK National Conference — artwork from SUIT, Recovery Near You, and Good Shepherd clients, speakers including Pat McFadden MP, Dr Ed Day, Dr Jane Booth, and Alan Jarvis from Base 25, with lived experience shares from across the region.'
      ]
    },
    {
      type: 'text',
      title: 'National Recovery Walk 2025 — West Park',
      paragraphs: [
        'A celebration of unity, diversity, creativity, and strength in Wolverhampton — SUIT, Recovery Near You, Good Shepherd, and Public Health putting the city at the forefront of addiction support in the UK.'
      ]
    },
    {
      type: 'text',
      title: 'Wolverhampton PRIDE',
      paragraphs: [
        'Pride celebrates inclusivity, identity, freedom, and LGBT+ rights. We have attended with Recovery Near You with colourful outreach stalls raising awareness of lived experience support.'
      ]
    },
    {
      type: 'text',
      title: 'British Library book launch',
      paragraphs: [
        'In January 2026, SUIT helped launch “Lived Experience Recovery Organisations” at the British Library with Dame Carol Black and Dr Ed Day — the same story told on our Publications page.'
      ],
      links: [{ label: 'Publications on this site', href: '/news-more/publications' }]
    },
    {
      type: 'text',
      title: 'DDN Conferences & more',
      paragraphs: [
        'Highlights from DDN Conference July 2023 with Marcus Johnson, Sanjeev Kumar, Karolina Sowinska, and Christiane Jenkins — plus Aquarius Recovery conferences, Halloween Tattoo Bash fundraisers for SUIT via WVCA, and many more moments captured below.'
      ]
    }
  ],
  gallery: galleryFor('/conferences', 18)
};

// gallery page
data.pages.gallery = {
  title: 'Gallery',
  heroLead: 'Creative recovery in pictures — drama, literature festival, Forest Faced, and Asylum Artist Quarter.',
  legacyUrl: 'https://www.suitrecoverywolverhampton.com/gallery',
  sections: [
    {
      type: 'text',
      title: 'Drama',
      paragraphs: ['“The Lack of Giving a S**t, and How to Overcome It” — Arena Theatre, 15 November 2024. Photographs by Steph Teague.']
    },
    {
      type: 'text',
      title: 'Wolverhampton Literature Festival',
      paragraphs: ['#poPARTofrecovery, 2024 — photos and film stills by Christiane.']
    },
    {
      type: 'text',
      title: 'The Forest Faced — 2025',
      paragraphs: ['Photos and film still art by Christiane.']
    },
    {
      type: 'text',
      title: 'Asylum Artist Quarter',
      paragraphs: ['Projects with Asylum — photos credited to Christiane, Sally Rowley, Corin Taylor-Salter, Alex Bird, and Peter Chand.']
    }
  ],
  gallery: galleryFor('/gallery', 16)
};

// announcements
data.pages.announcements = {
  title: 'Announcements',
  heroLead: 'Upcoming dates, consultations, liver scan pop-ups, and cultural engagement news.',
  legacyUrl: 'https://www.suitrecoverywolverhampton.com/announcements',
  sections: [
    {
      type: 'text',
      title: 'University of Wolverhampton — Student Union',
      paragraphs: [
        'Save the date: Wednesday 6th May, 1:00pm–3:00pm, Student Union Luna Lounge — an informal gathering for students, researchers, and staff to learn how SUIT can help, who we work with, and how to refer or get involved.',
        'Posters designed by social science and graphic design students to raise awareness of addiction and reduce stigma.'
      ]
    },
    {
      type: 'text',
      title: 'Gambling Harm Reduction Strategy consultation',
      paragraphs: [
        'Wolverhampton Council’s public consultation to shape a new Gambling Harm Reduction Strategy — separate consultations for adults and for children and young people. Check the legacy announcements page for current links and deadlines.'
      ],
      links: [{ label: 'Legacy announcements (consultation links)', href: 'https://www.suitrecoverywolverhampton.com/announcements' }]
    },
    {
      type: 'text',
      title: 'Health, wellbeing & liver scans',
      paragraphs: [
        'Pop-up clinics with SUIT and Recovery Near You — see legacy page for the latest dates and venues (e.g. Science Park, Gurdwaras).',
        '“Over 1,200 liver scans have now been completed at pop-up clinics across Wolverhampton…” — Councillor Obaida Ahmed, Cabinet Member for Health, Wellbeing and Community, City of Wolverhampton Council (Dec 2025).'
      ],
      links: [{ label: 'Cultural outreach — Punjabi project', href: '/community/outreach/punjabi' }]
    },
    {
      type: 'text',
      title: 'Mental Health Peer Support Drop-Ins',
      paragraphs: ['First Friday of every month, 10am–12pm, Train Station Hub WV1 1LE — see Mental Health Support for crisis lines and partners.' ],
      links: [{ label: 'Mental Health Support on this site', href: '/news-more/mental-health-support' }]
    },
    {
      type: 'text',
      title: 'Yoga with Cate',
      paragraphs: [
        'Gratitude to Cate for continued support and patronage towards SUIT — yoga and wellbeing in Wolverhampton.'
      ]
    }
  ],
  gallery: galleryFor('/announcements', 14)
};

// our vision
data.pages['our-vision'] = {
  title: 'Our Vision',
  heroLead: 'SUIT — Wolverhampton’s Lived Experience Recovery Organisation (LERO) — peer-led wraparound support for over 17 years.',
  legacyUrl: 'https://www.suitrecoverywolverhampton.com/our-vision',
  sections: [
    {
      type: 'text',
      title: 'How we help',
      paragraphs: [
        'SUIT are Wolverhampton’s LERO, working alongside the clinical treatment provider. We have won multiple awards including the Queen’s Award for Voluntary Services 2014 and European recognition for good practice.',
        'Strategic involvement is key: we train and support service users to attend local, regional, and national meetings so voices are heard and acted on. SUIT is a project within WVCA; all paid staff and volunteers have lived experience of drug and/or alcohol problems. We support Recovery Near You in delivering Public Health contracts and are the contracted LERO for the local authority.'
      ]
    },
    {
      type: 'text',
      title: 'SUIT can support people with',
      items: [
        'Advocacy and championing vulnerable adults',
        'Accessing clinical treatment and removing barriers to healthcare',
        'SMART and other mutual aid support',
        'Benefits advice — PIP, UC, ESA, JSA',
        'Form filling — PIP, UC50, ESA, housing, job applications',
        'Housing and homelessness support',
        'IT access and support',
        'Referrals — Changing Lives, Good Shepherd, Wolves Foundation, Brighter Mindset, Rethink',
        'Buddy support, mentoring, one-to-one support',
        'Groupwork, aftercare, creative arts and projects',
        'Support for prison leavers',
        'Debt advice and payment plans',
        'Job search and CV support',
        'Education and training advice',
        'Signposting across the city',
        'Consultancy, education, and events',
        'Outreach and home visits'
      ]
    },
    {
      type: 'text',
      title: 'Recreational activities',
      paragraphs: [
        'We refer to activities that support mental and physical wellbeing and social networks — with partners such as Wolves Foundation Head4Health, Yoga with Cate, University of Wolverhampton, Geese Theatre, and Asylum Artist Quarter.'
      ]
    },
    {
      type: 'text',
      title: 'Volunteering',
      paragraphs: [
        'Structured volunteering for people who can show stability in life and recovery — also opportunities for affected family and friends. Volunteers receive relapse prevention planning, supervision, and training towards qualifications and goals.',
        'Please speak to our Volunteer Coordinator Michelle Lane: michelle.lane@wvca.org.uk. Applicants are ideally six months substance-free but are assessed on application.'
      ]
    }
  ],
  gallery: galleryFor('/our-vision', 6)
};

const outPath = path.join(root, 'data', 'news-more.json');
if (fs.existsSync(outPath)) {
  try {
    const prev = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    if (Array.isArray(prev.cards) && prev.cards.length) data.cards = prev.cards;
    if (typeof prev.hubTitle === 'string' && prev.hubTitle.trim()) data.hubTitle = prev.hubTitle;
    if (typeof prev.hubIntro === 'string' && prev.hubIntro.trim()) data.hubIntro = prev.hubIntro;
  } catch (e) {
    console.warn('[build-news-more-data] Could not merge hub from existing news-more.json:', e.message);
  }
}
fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Wrote data/news-more.json with', Object.keys(data.pages).length, 'pages');
console.log('Tip: npm run build:static (or npm start) refreshes public/*.html');
