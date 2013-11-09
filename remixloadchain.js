// Loads remix info.
function createRemixLoadChain(remixer, trackInfoArray, progress, done) {
  var chain = {
    remixer: remixer,
    trackInfoArray: trackInfoArray,
    trackIndex: 0,
    progress: progress,
    done: done,
    receivedTracks: []
  };

  chain.loadChain = function loadChain() {
    this.scriptIndex = 0;
    this.loadNextTrack();
  };

  chain.loadNextTrack = function loadNextTrack() {
    if (this.trackIndex < this.trackInfoArray.length) {
      var trackInfo = this.trackInfoArray[this.trackIndex];
      this.remixer.remixTrackById(trackInfo.trackId, trackInfo.trackURL, 
        this.receiveTrack.bind(this));
    }
    else {
      this.done(null, this.receivedTracks);
    }
  };

  chain.receiveTrack = function receiveTrack(track, percent) {
    this.progress(track, percent);

    if (percent === 100) {
      // 'ok' comes after 'complete'.
      if (track.status === 'ok') {
        this.receivedTracks.push(track);
        ++this.trackIndex;
        this.loadNextTrack();
      }
      else if (track.status !== 'complete') {
        this.done(track.status);
      }
    }
  };

  return chain;
}
