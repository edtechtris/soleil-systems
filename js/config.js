/* Starting with Soleil — settings.
   Data always saves on the player's device and can be exported as JSON.
   To also send xAPI statements to a Learning Record Store (LRS), fill in lrs below.
   Use a key that can only WRITE statements: anything here is visible to anyone who opens the page. */
window.BP_CONFIG = {
  gameVersion: '0.2.0',
  activityBase: 'https://edtechtris.github.io/soleil-systems', // any stable URL you own; used as xAPI activity IDs
  lrs: {
    endpoint: '', // e.g. 'https://your-lrs.example.com/xapi/'  (must end with /)
    auth: ''      // e.g. 'Basic ' + btoa('key:secret')
  }
};
