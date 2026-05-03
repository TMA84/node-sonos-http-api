# Bugfix Requirements Document

## Introduction

When attempting to play a SiriusXM station via the HTTP API using a station number or name (e.g., `/Office/siriusXM/25`), the system returns a 500 error from the Sonos AVTransport control endpoint. Playing SiriusXM from Sonos Favorites works correctly because favorites store the current valid URI and metadata. The root cause is twofold: (1) the hardcoded SiriusXM URI parameters (`sid=37`, `flags=8480`, `sn=11`) and metadata format are outdated for current Sonos firmware, and (2) when no search results are found, the function returns `undefined` instead of a rejected promise, causing unhandled downstream behavior.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user requests a SiriusXM station by number or name via the API THEN the system generates a URI with hardcoded parameters (`sid=37&flags=8480&sn=11`) that are rejected by the Sonos player, resulting in a 500 error from `/MediaRenderer/AVTransport/Control`

1.2 WHEN a user requests a SiriusXM station by number or name via the API THEN the system generates metadata with a hardcoded `parentID` format and `cdudn` descriptor value of `_` that is no longer accepted by current Sonos firmware

1.3 WHEN a user requests a SiriusXM station that does not match any entry in the channel list THEN the system returns `undefined` instead of a rejected promise, causing unhandled behavior in the calling code

### Expected Behavior (Correct)

2.1 WHEN a user requests a SiriusXM station by number or name via the API THEN the system SHALL generate a URI with valid service parameters that are accepted by the Sonos player and the station SHALL begin playing

2.2 WHEN a user requests a SiriusXM station by number or name via the API THEN the system SHALL generate metadata in a format compatible with current Sonos firmware so that the AVTransport control endpoint processes it successfully

2.3 WHEN a user requests a SiriusXM station that does not match any entry in the channel list THEN the system SHALL return a rejected promise with a descriptive error message indicating no matching station was found

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user requests SiriusXM channel data via the `data` command THEN the system SHALL CONTINUE TO retrieve favorites and output channel information to the console

3.2 WHEN a user requests the SiriusXM channel list via the `channels` command THEN the system SHALL CONTINUE TO output sorted channel numbers to the console

3.3 WHEN a user requests the SiriusXM station list via the `stations` command THEN the system SHALL CONTINUE TO output adjusted station titles to the console

3.4 WHEN a user searches for a SiriusXM station by number or name and a match is found THEN the system SHALL CONTINUE TO use Fuse.js fuzzy search to find the best matching channel from the channel list

3.5 WHEN a SiriusXM station is successfully matched THEN the system SHALL CONTINUE TO call `player.coordinator.setAVTransport()` followed by `player.coordinator.play()` to start playback
