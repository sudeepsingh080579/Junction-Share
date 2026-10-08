export const PRIVACY_EFFECTIVE = 'October 8, 2026';

export const PRIVACY_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'Summary',
    body: 'JunctionShare has no email sign-in and no in-app payments, no advertising SDKs, and does not sell personal information. When you save your profile, your first name and WhatsApp number are stored on this phone and on the matching service. Your number is shown to another person only after you both tap Interested. Location is used to find nearby requests and to show your request to people near you. A request stays on the server only until its time window ends. Continuing a match opens WhatsApp, which is operated by Meta under its own policies.',
  },
  {
    heading: 'Information stored on your device',
    body: 'Profile stores your display name and WhatsApp number in the device secure store, along with an anonymous matching session. An active request is also stored on the device until you end it or the time window expires. On a new install the app clears secure-store values left behind by a previous install, because the iOS keychain can survive uninstall.',
  },
  {
    heading: 'Location',
    body: 'JunctionShare asks for location when you broadcast so it can show your request to nearby riders and find requests near you. It asks for While Using the App first, then for Always. Always is used only while you have an active request: the app keeps updating your position in the background so people nearby can still see your request if you move. If you deny location, Home and Profile stay available and you are shown why location is needed, with a link to Settings. Broadcast needs While Using permission. Coordinates are used to measure distance and are not shown to other people as a map pin or address. Background updates stop when you end the request or the time window expires.',
  },
  {
    heading: 'Requests stored until they expire',
    body: 'When you broadcast, the matching service stores your first name, destination, optional note, role, radius, time window, and device coordinates. Other people with an active request of the opposite role, inside the shared radius, can see your first name, approximate distance, destination, and note until the window ends. The service stops returning the request when the window ends and deletes the row, including coordinates, shortly afterward. Ending the request removes it immediately.',
  },
  {
    heading: 'Name and WhatsApp number',
    body: 'Your first name is visible to nearby people who have an active request. Your WhatsApp number is not included in the nearby list. It is shared only after both of you tap Interested. The app does not read your contacts.',
  },
  {
    heading: 'Destination search and maps',
    body: 'The destination text you search is sent to Photon (photon.komoot.io, Komoot) or, when a Google Maps API key is configured for the build, to Google Places. The map preview loads Google Maps. Those providers process the query under their own policies.',
  },
  {
    heading: 'WhatsApp handoff',
    body: 'Chat on WhatsApp opens a wa.me link to the other person’s number with a prefilled greeting. That conversation is handled by WhatsApp (Meta), not by JunctionShare. This release does not send WhatsApp template alerts.',
  },
  {
    heading: 'Data retention',
    body: 'On-device profile data remains until you clear app data or uninstall. The iOS keychain can keep it after uninstall; JunctionShare deletes those keys when it detects a fresh install. On the matching service, request rows and their coordinates are removed shortly after the time window ends, or immediately when you end the request. The anonymous session and saved name and number remain until you uninstall or we delete them at your request. Questions: hello@rydio.app.',
  },
];
