export type Language = 'en' | 'fr';

const translations = {
  en: {
    nav: {
      ourStory: 'Our Story',
      vision: 'Vision',
      events: 'Events',
      gallery: 'Gallery',
      rsvp: 'RSVP',
      invitation: 'Invitation',
      administration: 'Administration',
      langSwitch: 'FR',
    },
    hero: {
      badge: 'A Sacred Union · Kinshasa, DR Congo',
      theWeddingOf: 'The Wedding of',
      subtitle: 'A Powerful Covenant of Love',
      importantDates: 'Important Dates',
      dates: [
        {
          event: 'Civil Wedding',
          date: 'May 29, 2026 by 09:00 AM',
          detail: 'Commune de Ngaliema · Kinshasa, DR Congo',
        },
        {
          event: 'Traditional Wedding',
          date: 'June 26, 2026 by 09:00 AM',
          detail: 'Morning Ceremony by 09:00 AM at Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema, Ref: Tunel juste après la parcelle de l\'Apôtre MUTOMBO KALOMBO',
        },
        {
          event: 'Religious Wedding & Blessing',
          date: 'June 26, 2026 by 4:00 PM',
          detail: 'Evening Ceremony by 4:00 PM at Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema, at LES MESSAGERS CHURCH.',
        },
        {
          event: 'Reception Celebration',
          date: 'June 26, 2026 by 9:00 PM',
          detail: 'Night Celebration by 9:00 PM at Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema',
        },
      ],
      verse: '"Therefore what God has joined together, let no one separate."',
      verseRef: '— Matthew 19:6',
    },
    countdown: {
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds',
    },
    ourStory: {
      eyebrow: 'Written in the Stars',
      title: 'Our Story',
      milestones: [
        {
          year: '2022',
          title: 'A Divine Encounter',
          description:
            'On Thursday November 18th in the vibrant heart of Kinshasa, two souls crossed paths in a moment that felt written by the hand of God. Jonathan and Maria met, and nothing would ever be the same.',
        },
        {
          year: '2023',
          title: 'Love Takes Root',
          description:
            'Through shared prayers, late-night conversations about faith, dreams, and the universe, their connection deepened. A bond built on purpose and genuine love began to flourish.',
        },
        {
          year: '2024',
          title: 'A Covenant Formed, the Engagement',
          description:
            'On June 29th, Jonathan, the Powerful Teacher — a man of vision, faith, and excellence — made his intentions known. Maria, embodyment of grace and radiant purpose, said yes. Their families rejoiced. Heaven celebrated in a ceremony of pre-dowry.',
        },
        {
          year: '2025',
          title: 'Dowry Presentation',
          description:
            'On October 25th, in a ceremony filled with joy, tradition, and the blessing of both families, Jonathan and Maria became officially united together forever. The journey toward their powerful union had officially begun.',
        },
        {
          year: '2026',
          title: 'The Wedding',
          description:
            'On June 26, 2026, before God, family, and beloved friends, Jonathan Lokala - Lomboto and Maria Nzitusu Mvibudulu will exchange their vows. Two destinies united. One powerful legacy begins.',
        },
      ],
    },
    vision: {
      eyebrow: 'Beyond the Wedding Day',
      title: 'The Vision of Our Union',
      tagline: 'Two destinies united to build a',
      taglineHighlight: 'Powerful',
      taglineSuffix: 'future.',
      pillars: [
        {
          title: 'Faith',
          description:
            "Rooted in Christ, this union is anchored in the eternal. Every step of their journey is guided by prayer, scripture, and unwavering trust in God's perfect plan.",
        },
        {
          title: 'Purpose',
          description:
            'Jonathan, the Powerful Teacher, and Maria — a woman of rare elegance and divine strength — share a divine calling. Together they are committed to excellence, education, and making a lasting impact on every life they touch.',
        },
        {
          title: 'Legacy',
          description:
            'From the soil of the Democratic Republic of Congo to the world stage, this marriage will build a legacy for their children, their community, and generations to come.',
        },
        {
          title: 'Powerful Unity',
          description:
            'When two visionaries become one, the result is extraordinary. Their combined gifts in technology, teaching, faith, and love create a force that is truly POWERFUL.',
        },
      ],
      identityEyebrow: 'The Identity',
      identityTitle: 'POWERFUL',
      identityDescription:
        'A word that defines Jonathan. A word that defines their union. A word that will echo through generations as the hallmark of a marriage built on God, love, and purpose.',
    },
    events: {
      eyebrow: 'Mark Your Calendar',
      title: 'Event Program',
      items: [
        {
          label: 'Civil Wedding',
          date: 'Friday, May 29, 2026 by 09:00 AM',
          time: 'Morning',
          location: 'Commune de Ngaliema',
          city: 'Kinshasa, Democratic Republic of Congo',
          description: 'The official legal union before civil authorities, the foundation of their covenant.',
        },
        {
          label: 'Traditional Wedding',
          date: 'Friday, June 26, 2026 by 09:00 AM',
          time: 'Morning Ceremony, by 10:00 AM',
          location: "Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema, Ref: Tunel juste après la parcelle de l'Apôtre MUTOMBO KALOMBO",
          city: 'Kinshasa, Democratic Republic of Congo',
          description: 'A celebration of cultural heritage and ancestral blessings, honoring their Congolese roots.',
        },
        {
          label: 'Religious Wedding & Nuptial Blessing',
          date: 'Friday, June 26, 2026 by 4:00 PM',
          time: 'Evening Ceremony by 4:00 PM',
          location: "Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema, at LES MESSAGERS CHURCH.",
          city: 'Kinshasa, Democratic Republic of Congo',
          description: 'The sacred ceremony before God and the Church, where vows are exchanged under divine blessing.',
        },
        {
          label: 'Reception Celebration',
          date: 'Friday, June 26, 2026 by 9:00 PM',
          time: 'Night Celebration by 9:00 PM',
          location: 'Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema',
          city: 'Kinshasa, Democratic Republic of Congo',
          description: 'An elegant evening of joy, music, dance, and celebration to honor the newlyweds.',
        },
      ],
    },
    gallery: {
      eyebrow: 'Our Journey Through Time',
      title: 'Our Gallery',
      categories: [
        {
          year: '2022',
          title: 'A Divine Encounter',
          description: 'November 18th - Two souls meet in Kinshasa',
          images: [
            { alt: 'First meeting moment', title: 'A Divine Encounter' },
            { alt: 'Kinshasa city moments', title: 'In the Heart of Kinshasa' },
            { alt: 'Romantic beginning', title: 'Where It All Began' },
          ],
        },
        {
          year: '2023',
          title: 'Love Takes Root',
          description: 'Shared prayers and deep conversations',
          images: [
            { alt: 'Growing connection', title: 'Love Takes Root' },
            { alt: 'Intimate moments', title: 'Faith & Prayer Together' },
            { alt: 'Bond deepening', title: 'Connected Souls' },
          ],
        },
        {
          year: '2024',
          title: 'A Covenant Formed',
          description: 'June 29th - The Engagement',
          images: [
            { alt: 'Engagement rings and symbols', title: 'Sacred Covenant' },
            { alt: 'Engagement celebration', title: 'A Promise Made' },
            { alt: 'Family joy and blessing', title: 'Families United' },
          ],
        },
        {
          year: '2025',
          title: 'Dowry Presentation',
          description: 'October 25th - Traditional Union',
          images: [
            { alt: 'Dowry ceremony tradition', title: 'Tradition & Honor' },
            { alt: 'Family gathering ceremony', title: 'Forever United' },
            { alt: 'Celebration with loved ones', title: 'A Journey Together' },
          ],
        },
        {
          year: '2026',
          title: 'The Wedding',
          description: 'June 26th - The Grand Celebration',
          images: [
            { alt: 'Wedding day elegance', title: 'Two Hearts, One Destiny' },
            { alt: 'Powerful celebration', title: 'A Powerful Union' },
            { alt: 'Wedding legacy begins', title: 'Legacy Begins' },
          ],
        },
      ],
    },
    groomMessage: {
      eyebrow: 'Words from the Groom',
      title: 'A Personal Message',
      paragraphs: [
        'To each of you who will witness this moment — this is not simply a wedding. This is a declaration. A declaration that God is faithful, that purpose matters, and that love, when rooted in faith, is truly unstoppable.',
        "Maria and I have walked separate paths, each shaped by God's hand, until the day He made those paths one. I am a teacher. I am a builder. I am a believer. And today, I am also a husband-to-be deeply honored to stand before God and our people to make this covenant.",
        'Together, we will build. We will teach. We will lead. We will love. And we will do it all',
        'Your presence, your love, and your blessings on this day are a treasure we will carry for a lifetime. Thank you for being part of our story.',
        '"He who finds a wife finds a good thing and obtains favor from the Lord." — Proverbs 18:22.',
      ],
      powerfully: 'Powerfully',
      subtitle: '"First Born" · The Powerful Teacher.',
    },
    rsvp: {
      eyebrow: 'Please reply before May 1, 2026',
      title: 'RSVP',
      firstName: 'First Name',
      postName: 'Post Name',
      lastName: 'Last Name',
      willYouAttend: 'Will you attend?',
      attending: 'Yes, with joy',
      notAttending: 'No, sorry',
      maybe: 'Maybe',
      guestsLabel: 'Number of guests',
      email: 'Email (optional)',
      phone: 'Phone (optional)',
      message: 'Message to the couple (optional)',
      messagePlaceholder: 'Share your blessing...',
      submit: 'Confirm My Attendance',
      sending: 'Sending...',
      notFound:
        'Your name was not found in the guest list. Please verify the spelling or contact the couple directly.',
      error: 'An error occurred. Please try again later.',
      successTitle: 'Response received',
      successMessage:
        "Thank you for your confirmation. Jonathan & Maria look forward to sharing this prophetic moment with you.",
    },
    invitation: {
      eyebrow: 'Exclusively Yours',
      title: 'Your Personal Invitation',
      description:
        "Enter your name below to access your personalized invitation to Jonathan & Maria's wedding celebration.",
      firstName: 'First Name',
      postName: 'Post Name',
      postNameOptional: '(optional)',
      lastName: 'Last Name',
      notFound:
        'We are honored by your interest, but this invitation is reserved for our registered guests. Please verify the spelling of your name or contact Jonathan & Maria directly.',
      error: 'Something went wrong. Please try again.',
      submit: 'Access My Invitation',
      verifying: 'Verifying...',
      hint: 'Your invitation is uniquely crafted for you. Names are case-insensitive.',
      // Card texts
      cardCelebration: 'The Wedding Celebration',
      cardInvited: 'You are',
      cardInvitedHighlight: 'POWERFULLY',
      cardInvitedSuffix: 'invited to celebrate the union of',
      cardDear: 'Dear',
      cardCouple: 'This invitation covers your household as a couple.',
      cardHonor:
        'It is our great honor to welcome you to this sacred and powerful moment of our lives. Your presence will make this celebration complete.',
      cardSchedule: 'Wedding Schedule',
      cardScheduleItems: [
        { event: 'Civil Wedding', date: 'May 29, 2026', detail: 'Commune de Ngaliema · Kinshasa, DR Congo', time: 'Morning by 9:00 AM' },
        { event: 'Traditional Wedding', date: 'June 26, 2026', detail: "Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema, Ref: Tunel juste après la parcelle de l'Apôtre MUTOMBO KALOMBO.", time: 'Morning by 09:00 AM' },
        { event: 'Religious Wedding & Blessing', date: 'June 26, 2026', detail: "Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema, at LES MESSAGERS CHURCH.", time: 'Evening by 4:00 PM' },
        { event: 'Reception Celebration', date: 'June 26, 2026', detail: 'Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema', time: 'Night by 9:00 PM' },
      ],
      cardVerse: '"Therefore what God has joined together, let no one separate."',
      cardVerseRef: '— Matthew 19:6',
      cardSubtitle: '"First Born" · The Powerful Teacher.',
      download: 'Download My Invitation',
      closeLabel: 'Close invitation',
    },
    footer: {
      tagline: '"A Powerful Covenant of Love"',
      madeWith: 'Made with',
      madeIn: 'in Kinshasa, DR Congo',
      verse: '"Therefore what God has joined together, let no one separate." — Matthew 19:6',
    },
  },

  fr: {
    nav: {
      ourStory: 'Notre Histoire',
      vision: 'Vision',
      events: 'Événements',
      gallery: 'Galerie',
      rsvp: 'RSVP',
      invitation: 'Invitation',
      administration: 'Administration',
      langSwitch: 'EN',
    },
    hero: {
      badge: 'Une Union Sacrée · Kinshasa, RD Congo',
      theWeddingOf: 'Le Mariage de',
      subtitle: 'Une Alliance Puissante d\'Amour',
      importantDates: 'Dates Importantes',
      dates: [
        {
          event: 'Mariage Civil',
          date: '29 mai 2026 à 09h00',
          detail: 'Commune de Ngaliema · Kinshasa, RD Congo',
        },
        {
          event: 'Mariage Traditionnel',
          date: '26 juin 2026 à 09h00',
          detail: "Cérémonie matinale à 09h00 · Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema, Réf : Tunel juste après la parcelle de l'Apôtre MUTOMBO KALOMBO",
        },
        {
          event: 'Mariage Religieux & Bénédiction',
          date: '26 juin 2026 à 16h00',
          detail: "Cérémonie du soir à 16h00 · Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema, à LES MESSAGERS CHURCH.",
        },
        {
          event: 'Réception & Célébration',
          date: '26 juin 2026 à 21h00',
          detail: "Fête nocturne à 21h00 · Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema",
        },
      ],
      verse: '« Ce que Dieu a uni, que l\'homme ne le sépare pas. »',
      verseRef: '— Matthieu 19:6',
    },
    countdown: {
      days: 'Jours',
      hours: 'Heures',
      minutes: 'Minutes',
      seconds: 'Secondes',
    },
    ourStory: {
      eyebrow: 'Écrit dans les Étoiles',
      title: 'Notre Histoire',
      milestones: [
        {
          year: '2022',
          title: 'Une Rencontre Divine',
          description:
            'Le jeudi 18 novembre, au cœur vibrant de Kinshasa, deux âmes se sont croisées dans un moment qui semblait écrit par la main de Dieu. Jonathan et Maria se sont rencontrés, et plus rien ne serait jamais pareil.',
        },
        {
          year: '2023',
          title: 'L\'Amour Prend Racine',
          description:
            'À travers des prières partagées et des conversations nocturnes sur la foi, les rêves et l\'univers, leur connexion s\'est approfondie. Un lien bâti sur la vocation et un amour sincère a commencé à s\'épanouir.',
        },
        {
          year: '2024',
          title: 'Une Alliance Scellée, les Fiançailles',
          description:
            'Le 29 juin, Jonathan, l\'Enseignant Puissant — un homme de vision, de foi et d\'excellence — a déclaré ses intentions. Maria, incarnation de la grâce et de la beauté divine, a dit oui. Leurs familles ont réjoui. Le ciel a célébré lors d\'une cérémonie de pré-dot.',
        },
        {
          year: '2025',
          title: 'Présentation de la Dot',
          description:
            'Le 25 octobre, lors d\'une cérémonie empreinte de joie, de tradition et de la bénédiction des deux familles, Jonathan et Maria ont été officiellement unis pour toujours. Le chemin vers leur puissante union avait officiellement commencé.',
        },
        {
          year: '2026',
          title: 'Le Mariage',
          description:
            'Le 26 juin 2026, devant Dieu, la famille et leurs chers amis, Jonathan Lokala - Lomboto et Maria Nzitusu Mvibudulu échangeront leurs vœux. Deux destins unis. Un héritage puissant commence.',
        },
      ],
    },
    vision: {
      eyebrow: 'Au-delà du Jour du Mariage',
      title: 'La Vision de Notre Union',
      tagline: 'Deux destins unis pour bâtir un avenir',
      taglineHighlight: 'Puissant',
      taglineSuffix: '.',
      pillars: [
        {
          title: 'Foi',
          description:
            'Enracinée en Christ, cette union est ancrée dans l\'éternel. Chaque étape de leur parcours est guidée par la prière, les Écritures et une confiance indéfectible dans le plan parfait de Dieu.',
        },
        {
          title: 'Vocation',
          description:
            'Jonathan, l\'Enseignant Puissant, et Maria — une femme d\'une élégance rare et d\'une force divine — partagent un appel divin. Ensemble, ils s\'engagent pour l\'excellence, l\'éducation et un impact durable sur chaque vie qu\'ils touchent.',
        },
        {
          title: 'Héritage',
          description:
            'Du sol de la République Démocratique du Congo à la scène mondiale, ce mariage bâtira un héritage pour leurs enfants, leur communauté et les générations à venir.',
        },
        {
          title: 'Unité Puissante',
          description:
            'Quand deux visionnaires ne font plus qu\'un, le résultat est extraordinaire. Leurs dons combinés en technologie, enseignement, foi et amour créent une force véritablement PUISSANTE.',
        },
      ],
      identityEyebrow: 'L\'Identité',
      identityTitle: 'PUISSANT',
      identityDescription:
        'Un mot qui définit Jonathan. Un mot qui définit leur union. Un mot qui résonnera à travers les générations comme la marque d\'un mariage fondé sur Dieu, l\'amour et la vocation.',
    },
    events: {
      eyebrow: 'Notez la Date',
      title: 'Programme des Événements',
      items: [
        {
          label: 'Mariage Civil',
          date: 'Vendredi 29 mai 2026 à 09h00',
          time: 'Matin',
          location: 'Commune de Ngaliema',
          city: 'Kinshasa, République Démocratique du Congo',
          description: 'L\'union légale officielle devant les autorités civiles, le fondement de leur alliance.',
        },
        {
          label: 'Mariage Traditionnel',
          date: 'Vendredi 26 juin 2026 à 09h00',
          time: 'Cérémonie matinale à 10h00',
          location: "Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema, Réf : Tunel juste après la parcelle de l'Apôtre MUTOMBO KALOMBO",
          city: 'Kinshasa, République Démocratique du Congo',
          description: 'Une célébration du patrimoine culturel et des bénédictions ancestrales, honorant leurs racines congolaises.',
        },
        {
          label: 'Mariage Religieux & Bénédiction Nuptiale',
          date: 'Vendredi 26 juin 2026 à 16h00',
          time: 'Cérémonie du soir à 16h00',
          location: "Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema, à LES MESSAGERS CHURCH.",
          city: 'Kinshasa, République Démocratique du Congo',
          description: 'La cérémonie sacrée devant Dieu et l\'Église, où les vœux sont échangés sous la bénédiction divine.',
        },
        {
          label: 'Réception & Célébration',
          date: 'Vendredi 26 juin 2026 à 21h00',
          time: 'Fête nocturne à 21h00',
          location: 'Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema',
          city: 'Kinshasa, République Démocratique du Congo',
          description: 'Une soirée élégante de joie, musique, danse et célébration en l\'honneur des jeunes mariés.',
        },
      ],
    },
    gallery: {
      eyebrow: 'Notre Voyage à Travers le Temps',
      title: 'Notre Galerie',
      categories: [
        {
          year: '2022',
          title: 'Une Rencontre Divine',
          description: '18 novembre — Deux âmes se rencontrent à Kinshasa',
          images: [
            { alt: 'Premier moment de rencontre', title: 'Une Rencontre Divine' },
            { alt: 'Moments à Kinshasa', title: 'Au Cœur de Kinshasa' },
            { alt: 'Début romantique', title: 'Là où Tout a Commencé' },
          ],
        },
        {
          year: '2023',
          title: 'L\'Amour Prend Racine',
          description: 'Prières partagées et conversations profondes',
          images: [
            { alt: 'Connexion grandissante', title: 'L\'Amour Prend Racine' },
            { alt: 'Moments intimes', title: 'Foi & Prière Ensemble' },
            { alt: 'Lien qui s\'approfondit', title: 'Âmes Connectées' },
          ],
        },
        {
          year: '2024',
          title: 'Une Alliance Scellée',
          description: '29 juin — Les Fiançailles',
          images: [
            { alt: 'Symboles de fiançailles', title: 'Alliance Sacrée' },
            { alt: 'Célébration des fiançailles', title: 'Une Promesse Faite' },
            { alt: 'Joie des familles', title: 'Familles Réunies' },
          ],
        },
        {
          year: '2025',
          title: 'Présentation de la Dot',
          description: '25 octobre — Union Traditionnelle',
          images: [
            { alt: 'Tradition de la dot', title: 'Tradition & Honneur' },
            { alt: 'Cérémonie familiale', title: 'Unis pour Toujours' },
            { alt: 'Célébration avec les proches', title: 'Un Voyage Ensemble' },
          ],
        },
        {
          year: '2026',
          title: 'Le Mariage',
          description: '26 juin — La Grande Célébration',
          images: [
            { alt: 'Élégance du jour J', title: 'Deux Cœurs, Un Destin' },
            { alt: 'Célébration puissante', title: 'Une Union Puissante' },
            { alt: 'L\'héritage commence', title: 'L\'Héritage Commence' },
          ],
        },
      ],
    },
    groomMessage: {
      eyebrow: 'Mots du Marié',
      title: 'Un Message Personnel',
      paragraphs: [
        'À chacun d\'entre vous qui témoignera de ce moment — ce n\'est pas simplement un mariage. C\'est une déclaration. Une déclaration que Dieu est fidèle, que la vocation compte, et que l\'amour, enraciné dans la foi, est véritablement irrésistible.',
        'Maria et moi avons cheminé séparément, chacun façonné par la main de Dieu, jusqu\'au jour où Il a réuni nos chemins. Je suis un enseignant. Je suis un bâtisseur. Je suis un croyant. Et aujourd\'hui, je suis aussi un futur époux profondément honoré de me tenir devant Dieu et notre peuple pour sceller cette alliance.',
        'Ensemble, nous bâtirons. Nous enseignerons. Nous dirigerons. Nous aimerons. Et nous le ferons',
        'Votre présence, votre amour et vos bénédictions en ce jour sont un trésor que nous porterons toute notre vie. Merci de faire partie de notre histoire.',
        '« Celui qui trouve une femme trouve le bonheur et obtient la faveur de l\'Éternel. » — Proverbes 18:22.',
      ],
      powerfully: 'Puissamment',
      subtitle: '« Premier-Né » · L\'Enseignant Puissant.',
    },
    rsvp: {
      eyebrow: 'Merci de répondre avant le 1 mai 2026',
      title: 'RSVP',
      firstName: 'Prénom',
      postName: 'Post-nom',
      lastName: 'Nom',
      willYouAttend: 'Serez-vous présent(e) ?',
      attending: 'Oui, avec joie',
      notAttending: 'Non, désolé(e)',
      maybe: 'Peut-être',
      guestsLabel: 'Nombre d\'invités',
      email: 'Email (optionnel)',
      phone: 'Téléphone (optionnel)',
      message: 'Message au couple (optionnel)',
      messagePlaceholder: 'Partagez votre bénédiction...',
      submit: 'Confirmer ma présence',
      sending: 'Envoi en cours...',
      notFound:
        'Votre nom n\'a pas été trouvé dans la liste des invités. Vérifiez l\'orthographe ou contactez directement le couple.',
      error: 'Une erreur est survenue. Merci de réessayer plus tard.',
      successTitle: 'Réponse reçue',
      successMessage:
        'Merci pour votre confirmation. Jonathan & Maria se réjouissent de vivre ce moment prophétique avec vous.',
    },
    invitation: {
      eyebrow: 'Exclusivement pour Vous',
      title: 'Votre Invitation Personnelle',
      description:
        'Entrez votre nom ci-dessous pour accéder à votre invitation personnalisée au mariage de Jonathan & Maria.',
      firstName: 'Prénom',
      postName: 'Post-nom',
      postNameOptional: '(optionnel)',
      lastName: 'Nom',
      notFound:
        'Nous sommes honorés de votre intérêt, mais cette invitation est réservée à nos invités enregistrés. Veuillez vérifier l\'orthographe de votre nom ou contacter Jonathan & Maria directement.',
      error: 'Une erreur est survenue. Veuillez réessayer.',
      submit: 'Accéder à Mon Invitation',
      verifying: 'Vérification...',
      hint: 'Votre invitation est créée uniquement pour vous. Les noms ne sont pas sensibles à la casse.',
      // Textes de la carte
      cardCelebration: 'La Célébration du Mariage',
      cardInvited: 'Vous êtes',
      cardInvitedHighlight: 'PUISSAMMENT',
      cardInvitedSuffix: 'invité(e) à célébrer l\'union de',
      cardDear: 'Cher(e)',
      cardCouple: 'Cette invitation couvre votre foyer en tant que couple.',
      cardHonor:
        'C\'est un immense honneur de vous accueillir à ce moment sacré et puissant de notre vie. Votre présence rendra cette célébration complète.',
      cardSchedule: 'Programme du Mariage',
      cardScheduleItems: [
        { event: 'Mariage Civil', date: '29 mai 2026', detail: 'Commune de Ngaliema · Kinshasa, RD Congo', time: 'Matin à 9h00' },
        { event: 'Mariage Traditionnel', date: '26 juin 2026', detail: "Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema, Réf : Tunel juste après la parcelle de l'Apôtre MUTOMBO KALOMBO.", time: 'Matin à 09h00' },
        { event: 'Mariage Religieux & Bénédiction', date: '26 juin 2026', detail: "Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema, à LES MESSAGERS CHURCH.", time: 'Soir à 16h00' },
        { event: 'Réception & Célébration', date: '26 juin 2026', detail: 'Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema', time: 'Nuit à 21h00' },
      ],
      cardVerse: '« Ce que Dieu a uni, que l\'homme ne le sépare pas. »',
      cardVerseRef: '— Matthieu 19:6',
      cardSubtitle: '« Premier-Né » · L\'Enseignant Puissant.',
      download: 'Télécharger Mon Invitation',
      closeLabel: 'Fermer l\'invitation',
    },
    footer: {
      tagline: '« Une Alliance Puissante d\'Amour »',
      madeWith: 'Fait avec',
      madeIn: 'à Kinshasa, RD Congo',
      verse: '« Ce que Dieu a uni, que l\'homme ne le sépare pas. » — Matthieu 19:6',
    },
  },
} as const;

export type Translations = (typeof translations)[Language];
export default translations;
