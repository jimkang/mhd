function createPour() {

var pour = {
  apiKey: 'OJLZYPUNBP3M0CMNY',
  trackID: 'TRLXIRU12E5AD67A71',
  trackURL: 'Spanish Flea.mp3',  
  // trackID: 'TRCYWPQ139279B3308',
  // trackURL: '1451_-_D.mp3',
  trackID2: 'TRBIBEW13936EB37C9',
  trackURL2: '1451_-_E.mp3',
  // remixer: null,
  // player: null,
  // track: null,
  // track2: null,
  // remixed: null
};

pour.init = function init() {
  if (window.webkitAudioContext === undefined) {
    error("Sorry, this app needs advanced web audio. Your browser doesn't" +
      " support it. Try the latest version of Chrome");
  } 
  else {
    var context = new webkitAudioContext();

    remixer = createJRemixer(context, $, this.apiKey);
    player = remixer.getPlayer();
    $("#info").text("Loading analysis data...");

    var chain = createRemixLoadChain(remixer, [
        {
          trackId: this.trackID,
          trackURL: this.trackURL
        },
        {
          trackId: this.trackID2,
          trackURL: this.trackURL2
        }
      ],
      this.reportLoadProgress, function tracksLoaded(error, tracks) {
        if (error) {
          $("#info").text('Error loading tracks: ' + error);
        }
        else {
          this.mixTracks(tracks[0], tracks[1]);
        }
      }
      .bind(this)
    );
    chain.loadChain();
  }

};

pour.mixTracks = function mixTracks(track1, track2) {
  // Extract the first and third beats of track 1 with the second and fourth 
  // beats of track 2.
  remixed = [];
  var meter = parseInt(track1.analysis.track.time_signature, 10);
  var numberOfBeats = Math.min(track1.analysis.beats.length, 
    track2.analysis.beats.length);
  var numberOfFSegs = Math.min(
      track1.analysis.fsegments.length, 
      track2.analysis.fsegments.length);
  
  for (var i=0; i < numberOfFSegs; i++) {
    if (i % meter === 0 || i % meter === 2) {
      remixed.push(track1.analysis.fsegments[i]);
    } else if (i % meter === 1 || i % meter === 3) {
      remixed.push(track2.analysis.fsegments[i]);
    }
  }
  $("#info").text("Remix complete!");
};

pour.reportLoadProgress = function reportLoadProgress(track, percent) {
  $("#info").text(percent + "% of track loaded...");
};

return pour;
}

var pour = createPour();
pour.init();

