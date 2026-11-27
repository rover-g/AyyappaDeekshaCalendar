// Edit this file to change defaults. Settings saved from the gear menu override these.
window.DEEKSHA_CONFIG = {
  title: 'Mandala Deeksha',
  start: '2026-11-11',   // first day of Deeksha (yyyy-mm-dd)
  end:   '2026-12-22',   // final day (yyyy-mm-dd)
  rotateSeconds: 300,    // wallpaper auto-change; 0 = never
  embers: true,          // floating lamp-ember animation
  diya: true,
  mark: 'check',         // finished days: 'check' (small amber tick) or 'cross' (X over the date)            // lit diya lamp in front of the deity (tap it to put out / relight)
  // focus = which part of the image stays in view on laptops; focusMobile = on a portrait phone screen.
  // Each wallpaper loads from assets/ first; if the file is missing it falls back to `remote`.
  wallpapers: [
    { name: 'Ayyappa',      src: 'assets/wallpaper-ayyappa.jpg',
      remote: 'https://d8j0ntlcm91z4.cloudfront.net/user_3BQSyunsuvDpVTLTutWwEg2eIgt/hf_20261125_162312_b3206c01-83fc-450c-848c-5273c93782b5.jpeg', focus: '70% 50%', focusMobile: '80% 30%' },
    { name: 'Sannidhanam',  src: 'assets/wallpaper-sannidhanam.jpg',
      remote: 'https://d8j0ntlcm91z4.cloudfront.net/user_3BQSyunsuvDpVTLTutWwEg2eIgt/hf_20261125_162308_70822493-ff81-4434-97e8-ba926e68d720.jpeg', focus: '70% 50%', focusMobile: '72% 50%' },
    { name: 'Shiva',        src: 'assets/wallpaper-shiva.jpg',
      remote: 'https://d8j0ntlcm91z4.cloudfront.net/user_3BQSyunsuvDpVTLTutWwEg2eIgt/hf_20261125_162309_9b8f2929-b26f-4f98-9ba0-6ae342f8eef5.jpeg', focus: '70% 50%', focusMobile: '75% 40%' }
  ],
  // Devotional audio: the Audio button stays hidden until at least one track is listed here.
  // Use your own recordings or tracks you have permission to share: this repo is public.
  // Example: sharanaghosha: [{ name: 'Ayyappa Sharanaghosha', src: 'audio/sharanaghosha.mp3' }]
  audio: { sharanaghosha: [], pooja: [] }
};
