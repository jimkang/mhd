function createPour() {

var pour = {
  apiKey: 'OJLZYPUNBP3M0CMNY',
  trackID: 'TRLXIRU12E5AD67A71',
  trackURL: 'Spanish Flea.mp3',  
  // trackID: 'TRIMDDN12E5AB73EF1',
  // trackURL: '16 We Will Rock You.mp3',  

  
  // trackID: 'TRCYWPQ139279B3308',
  // trackURL: '1451_-_D.mp3',
  // trackID2: 'TRBIBEW13936EB37C9',
  // trackURL2: '1451_-_E.mp3',
  // trackID2: 'TRMPFJX12E5AB73FB6',
  // trackURL2: '17 We Are The Champions.mp3',
  remixer: null,
  player: null,
  // track: null,
  // track2: null,
  remixed: null,
  offlineMode: true,
  context: null,
  audioGain: null,
  track: null,
  notesLimit: 0,
  activeAudioSources: []
};

pour.init = function init() {
  if (window.webkitAudioContext === undefined) {
    error("Sorry, this app needs advanced web audio. Your browser doesn't" +
      " support it. Try the latest version of Chrome");
  } 
  else {
    this.context = new webkitAudioContext();
    this.audioGain = this.context.createGainNode();
    this.audioGain.gain.value = 1;
    this.audioGain.connect(this.context.destination);

    this.remixer = createJRemixer(this.context, $, this.apiKey);
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
          }
        ],
        this.reportLoadProgress, function tracksLoaded(error, tracks) {
          if (error) {
            $("#info").text('Error loading tracks: ' + error);
          }
          else {
            this.track = track1;
            this.mixTracks(tracks[0].analysis);
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
      this.track = track1;
      this.mixTracks(track1.analysis);
    }
  }
  .bind(this));
};

pour.mixTracks = function mixTracks(track1Analysis) {
  this.remixed = [];

  function randomlyScrewUpNote(note) {
    if (!shiftedLastNote && (Math.floor(Math.random() * 4) % 4) === 0) {
      note.shiftPitch = Math.pow(2, -1.0/12);
      shiftedLastNote = true;
    }
    else {
      shiftedLastNote = false;
    }
  }

  var notesSinceLastShift = 0;

  function screwUpLoudNote(note, track) {
    var competenceFactor = 4 - notesSinceLastShift;
    if (competenceFactor < 1) {
      competenceFactor = 1;
    }
    if (note.oseg.loudness_max > track.loudness && 
      (Math.floor(Math.random() * competenceFactor % competenceFactor) === 0)) {
      note.shiftPitch = Math.pow(2, 1.0/12);
      notesSinceLastShift = 0;
    }
    else {
      ++notesSinceLastShift;
    }
  }

  function lowAndSlow(note, nextNote) {
    note.shiftPitch = 0.5;
    note.duration = 0.2;
    if (nextNote) {
      nextNote.start -= note.duration * 0.8;
    }
  }

  function usePitchFromOtherNote(note, otherNote) {
    var dominantPitch1 = dominantPitch(note.oseg.pitches);
    var dominantPitch2 = dominantPitch(otherNote.oseg.pitches);
    var halfStepsDiff = dominantPitch1 - dominantPitch2;
    if (halfStepsDiff !== 0) {
      note.shiftPitch = Math.pow(2, halfStepsDiff/12);
    }
  }

  function useDurationFromOtherNote(note, otherNote, nextNote) {
    note.duration = otherNote.duration;
    var diff = otherNote.duration - note.duration;
    if (nextNote) {
      nextNote.start += diff;
    }
  }

  var notes1 = track1Analysis.tatums;
  this.notesLimit = notes1.length;
  var shiftedLastNote = false;

  // notes2 = _.sortBy(notes2, function getLoudness(note) {
  //   return note.oseg.loudness_start;
  // });

  for (var i = 0; i < this.notesLimit; ++i) {
    randomlyScrewUpNote(notes1[i]);
    this.remixed.push(notes1[i]);
  }

  $("#info").text("Remix complete!");
};

pour.reportLoadProgress = function reportLoadProgress(track, percent) {
  $("#info").text(percent + "% of track loaded...");
};

pour.play = function play() {
  // this.player.play(0, this.remixed);
  var when = 0;
  for (var i = 0; i < this.remixed.length; ++i) {
    var q = this.remixed[i];
    var audioSource = this.context.createBufferSource();
    audioSource.buffer = q.track.buffer;
    if (q.shiftPitch) {
        audioSource.playbackRate.value = q.shiftPitch;
    }

    audioSource.connect(this.audioGain);
    q.audioSource = audioSource;
    // currentlyQueued.push(audioSource);
    audioSource.noteGrainOn(when, q.start, q.duration);
    this.activeAudioSources.push(audioSource);

    when += parseFloat(q.duration);
  }
};

pour.stop = function stop() {
  this.activeAudioSources.forEach(function stopSource(audioSource) {
    audioSource.noteOff(0);
  });
  this.activeAudioSources = [];
};

function dominantPitch(pitches) {
  var dominantPitchValueAndPosition = pitches.reduce(
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
  return dominantPitchValueAndPosition.pos;
};

// Has no idea what octave anything's at.
function frequencyForPitch(pitchIndex) {
  // A is 9.
  var halfStepsDiff = pitchIndex - 9;
  return 440 * Math.pow(2, halfStepsDiff/12);
}

return pour;
}

var pour = createPour();
pour.init();


