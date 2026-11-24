/* Starting with Soleil — settings.
   Data always saves on the player's device and can be exported as JSON.
   To also send xAPI statements to a Learning Record Store (LRS), fill in lrs below.
   Use a key that can only WRITE statements: anything here is visible to anyone who opens the page. */
window.BP_CONFIG = {
  gameVersion: '0.3.8',
  activityBase: 'https://edtechtris.github.io/soleil-systems', // any stable URL you own; used as xAPI activity IDs
  // An objective counts as met when players get at least this share of its choices right.
  objectiveTarget: 0.75,
  lrs: {
    endpoint: 'https://soleil.lrs.io/xapi/', // Veracity Learning LRS
    // Key "Soleil321": WRITE-ONLY (it can send records but not read or delete them). Anything here is public.
    auth: 'Basic ' + btoa('d142d940-8e3d-4eb2-86b4-0e190a7b9da1:dcad1510-d7f5-4498-a732-2ae6d1e0a712')
  }
};
