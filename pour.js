function createPour() {

var pour = {
  apiKey: 'OJLZYPUNBP3M0CMNY',
  trackID: 'TRLXIRU12E5AD67A71',
  trackURL: 'Spanish Flea.mp3',  
  // trackID: 'TRCYWPQ139279B3308',
  // trackURL: '1451_-_D.mp3',
  // trackID2: 'TRBIBEW13936EB37C9',
  // trackURL2: '1451_-_E.mp3',
  trackID2: 'TRMPFJX12E5AB73FB6',
  trackURL2: '17 We Are The Champions.mp3',
  remixer: null,
  player: null,
  // track: null,
  // track2: null,
  // remixed: null,
  offlineMode: true,
  audiolet: null,
  synth: null,
  freqPattern: [],
  durationPattern: [],
  scale: null
};

pour.init = function init() {
  if (window.webkitAudioContext === undefined) {
    error("Sorry, this app needs advanced web audio. Your browser doesn't" +
      " support it. Try the latest version of Chrome");
  } 
  else {
    var context = new webkitAudioContext();
    this.audiolet = new Audiolet();
    this.synth = new Synth(this.audiolet);
    this.synth.connect(this.audiolet.output);

    // var tuning = new EqualTemperamentTuning();
    this.scale = new Scale([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

    this.remixer = createJRemixer(context, $, this.apiKey);
    this.player = this.remixer.getPlayer();
    $("#info").text("Loading analysis data...");

    if (this.offlineMode) {
      this.initOffline();
    }
    else {
      var chain = createRemixLoadChain(this.remixer, [
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
            this.mixTracks(tracks[0].analysis, tracks[1].analysis);
          }
        }
        .bind(this)
      );
      chain.loadChain();
    }
  }
};

pour.initOffline = function initOffline() {
  this.remixer.remixTrack({
    status: 'complete',
    analysis: spanishFleaResponse.query.results.json,
  },
  this.trackURL,
  function processedTrack1(track1, loadPercentage1) {
    if (loadPercentage1 === 100 && track1.status === 'ok') {
      this.remixer.remixTrack({
        status: 'complete',
        analysis: championsResponse.query.results.json,
      },
      this.trackURL2,
      function processedTrack2(track2, loadPercentage2) {
        if (loadPercentage2 === 100 && track2.status === 'ok') {
          this.mixTracks(track1.analysis, track2.analysis);
        }
      }
      .bind(this));
    }
  }
  .bind(this));
};

pour.mixTracks = function mixTracks(track1Analysis, track2Analysis) {
  // Extract the first and third beats of track 1 with the second and fourth 
  // beats of track 2.
  this.freqPattern = [];
  this.durationPattern = [];

  var meter = parseInt(track1Analysis.track.time_signature, 10);
  if (meter === 1) {
    // If it gives us a meter of 1, I'm guessing it couldn't figure it out.
    // Try 4.
    meter = 4;
  }

  var notes1 = track1Analysis.fsegments;
  var notes2 = track2Analysis.fsegments;
  var notesLimit = Math.min(notes1.length, notes2.length);

  for (var i = 0; i < notesLimit; ++i) {
    // TODO: Using track2's buffer with track1's rhythm stuff.
    var noteIndex = dominantNote(notes1[i].pitches);
    var dominantFreq = this.scale.getFrequency(noteIndex, 440, 2);
    this.freqPattern.push(dominantFreq);
    this.durationPattern.push(notes1[i].duration);
    // tatums2[i].start = .start;
    // tatums2[i].duration = tatums1[i].duration;
    // this.remixed.push(confidentTatums2[i]);
  }

  $("#info").text("Remix complete!");
};

pour.reportLoadProgress = function reportLoadProgress(track, percent) {
  $("#info").text(percent + "% of track loaded...");
};

pour.play = function play() {
  // this.player.play(0, this.remixed);
  this.audiolet.scheduler.play([new PSequence(this.freqPattern)], 
    new PSequence(this.durationPattern),
    this.playEvent.bind(this));
};

pour.playEvent = function playEvent(frequency) {
  // Set the gate
  // this.synth.trigger.trigger.setValue(1);
  // Calculate the frequency from the scale
  // var frequency = this.scale.getFrequency(degree,
  //                                         this.c2Frequency,
  //                                         3);
  // Set the frequency
  // this.synth.saw.frequency.setValue(frequency);
  var synth = new Synth(this.audiolet, frequency);
  synth.connect(this.audiolet.output);
};

function dominantNote(pitches) {
  var dominantNoteValueAndPosition = pitches.reduce(
    function biggerValueAndPosition(prevValAndPos, value, pos) {
      if (typeof prevValAndPos === 'number') {
        prevValAndPos = {
          value: prevValAndPos,
          pos: 0
        };
      }
  
      if (value > prevValAndPos.value) {
        return {
          value: value,
          pos: pos
        };
      }
      else {
        return prevValAndPos;
      }
    }
  );
  return dominantNoteValueAndPosition.pos;
};

return pour;
}

var pour = createPour();
pour.init();


