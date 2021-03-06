function createPour() {

var pour = {
  apiKey: 'OJLZYPUNBP3M0CMNY',
  // trackID: 'TRLXIRU12E5AD67A71',
  // trackURL: 'Spanish Flea.mp3',  
  // trackID: 'TRIMDDN12E5AB73EF1',
  // trackURL: '16 We Will Rock You.mp3',  

  
  // trackID: 'TRCYWPQ139279B3308',
  // trackURL: '1451_-_D.mp3',
  // trackID2: 'TRBIBEW13936EB37C9',
  // trackURL2: '1451_-_E.mp3',
  trackID: 'TRMPFJX12E5AB73FB6',
  trackURL: '17 We Are The Champions.mp3',
  offlineAnalysis: championsResponse.query.results.json,
  remixer: null,
  player: null,
  // track: null,
  // track2: null,
  remixed: null,
  context: null,
  audioGain: null,
  track: null,
  notesLimit: 0,
  activeAudioSources: [],
  currentlyPlayingIndex: 0,
  transitionDuration: 1000,
  colorDesignator: createColorDesignator(40, 192, 40, 255, 0.5, 1.0),
  camera: createCamera([0.2, 1.0]),
  graph: d3.select('#graph'),
  stopped: true,
  timeoutHandles: [],
  lastPlayedIndex: 0
};

pour.init = function init(done) {
  if (window.AudioContext === undefined) {
    throw new Error("Sorry, this app needs advanced web audio. Your browser doesn't" +
      " support it. Try the latest version of Chrome");
  } 
  else {
    this.context = new AudioContext();
    this.audioGain = this.context.createGain();
    this.audioGain.gain.value = 1;
    this.audioGain.connect(this.context.destination);

    this.remixer = createJRemixer(this.context, $, this.apiKey);
    this.player = this.remixer.getPlayer();
    $("#info").text("Loading analysis data...");

    this.initOffline(done);

    this.camera.setUpZoomOnBoard(d3.select('#board'), this.graph);

    d3.select('#songs').on('change', function selectChanged() {
      var wasStopped = pour.stopped;
      pour.stop();
      pour.trackURL = this.value;
      pour.init(resumePlay);

      function resumePlay() {
        if (!wasStopped) {
          pour.play();
        }
      }
    });
  }
};

pour.initOffline = function initOffline(done) {
  this.remixer.remixTrack({
    status: 'complete',
    analysis: this.offlineAnalysis,
  },
  this.trackURL,
  function processedTrack1(track1, loadPercentage1) {
    if (loadPercentage1 === 100 && track1.status === 'ok') {
      this.track = track1;
      this.mixTracks(track1.analysis);
      done();
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
    notes1[i].remixIndex = i;
    if (i > 15) {
      randomlyScrewUpNote(notes1[i]);
    }
    this.remixed.push(notes1[i]);
  }

  $("#info").text("Ready to play.");
};

pour.reportLoadProgress = function reportLoadProgress(track, percent) {
  $("#info").text(percent + "% of track loaded...");
};

pour.play = function play(remixChunks) {
  var start = 0;
  if (!remixChunks) {
    remixChunks = this.remixed;
    start = this.lastPlayedIndex;
  }
  this.stopped = false;
  // this.player.play(0, this.remixed);
  var when = 0;
  for (var i = start; i < remixChunks.length; ++i) {
    var q = remixChunks[i];
    var audioSource = this.context.createBufferSource();
    audioSource.buffer = q.track.buffer;
    if (q.shiftPitch) {
        audioSource.playbackRate.value = q.shiftPitch;
    }

    audioSource.connect(this.audioGain);
    q.audioSource = audioSource;
    // currentlyQueued.push(audioSource);
    audioSource.start(when, q.start, q.duration);
    this.activeAudioSources.push(audioSource);
    this.updateGraphOnPlay(when, i);

    when += parseFloat(q.duration);
  }
};

pour.stop = function stop() {
  this.stopped = true;
  this.activeAudioSources.forEach(function stopSource(audioSource) {
    audioSource.stop(0);
  });
  this.activeAudioSources = [];
  this.timeoutHandles.forEach(function cancelTimeout(handle) {
    clearTimeout(handle);
  });
  this.timeoutHandles = [];
};

pour.updateGraphOnPlay = function updateGraphOnPlay(when, currentlyPlayingIndex) {
  var handle = setTimeout(function playStarted() {
    this.updateGraph(currentlyPlayingIndex);
    this.lastPlayedIndex = currentlyPlayingIndex;
  }
  .bind(this),
  when * 1000 - this.transitionDuration - 500);

  this.timeoutHandles.push(handle);
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

pour.updateGraph = function updateGraph(currentlyPlayingIndex) {
  if (this.stopped) {
    return;
  }
  var noteCircles = this.graph.selectAll('circle').data(
    this.remixed.slice(0, currentlyPlayingIndex + 1));
  
  var entering = noteCircles.enter();
  var entered = entering.append('circle');

  entered
    .attr({
      cy: 0,
      cx: 0,
      r: 0,
      transform: function (d) {
        return 'translate(' + Math.floor((d.start + d.duration/2) * 140) + 
          ', 0)';
      },
      fill: function getColor(d) {
        return this.colorDesignator.getHSLAForVisitCount(
          d.oseg.loudness_start + 60);
      }
      .bind(this)
    });

  entered
    .on('click', function clickedCircle(d) {
      this.play(this.remixed.slice(d.remixIndex, d.remixIndex + 1))
      this.lastPlayedIndex = d.remixIndex;      
    }
    .bind(this))
    .transition()
    .duration(this.transitionDuration)
    .attr({
      transform: function (d) {
        return 'translate(' + Math.floor((d.start + d.duration/2) * 140) + 
          ', 200)';
      },
      r: function radius(d) {
        return Math.floor(d.duration/2 * 100);
      }
    });

  if (!entered.empty()) {
    this.camera.panToElement(entered);
  }
};

return pour;
}

var pour = createPour();
pour.init(logInitDone);

function logInitDone() {
  console.log('init done.');
}
