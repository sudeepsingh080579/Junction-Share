export const PRIVACY_EFFECTIVE = 'October 7, 2026';

export const PRIVACY_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'Summary',
    body: 'JunctionShare has no accounts or in-app payments in this release, no advertising SDKs, and does not sell personal information. Name, WhatsApp number, and privacy toggles stay on your device. Location is used only with your permission while a request is active. Continuing a match opens WhatsApp, which is operated by Meta under its own policies.',
  },
  {
    heading: 'Information stored on your device',
    body: 'Profile stores your display name, WhatsApp number, and opt-in choices in the device secure store. These values are not uploaded to a JunctionShare backend in this release.',
  },
  {
    heading: 'Location',
    body: 'With your permission, JunctionShare may access approximate or precise location while a carpool request is active so it can match nearby riders within about 100m–1km. You can decline location permission; broadcasting is then unavailable. This release also includes demo nearby riders so you can walk the full flow while live matching rolls out.',
  },
  {
    heading: 'Contacts',
    body: 'If you choose the contacts helper on Profile, the app may read contacts only to help fill your WhatsApp number. Contacts are not uploaded to JunctionShare servers.',
  },
  {
    heading: 'Destination search and maps',
    body: 'Search text may be sent to Google Places (if configured) or Photon by Komoot. Map previews may load Google Maps. Those providers process the query under their own policies.',
  },
  {
    heading: 'WhatsApp handoff',
    body: 'Chat on WhatsApp opens WhatsApp or a wa.me link with a prefilled message. Message content and the number you use are handled by WhatsApp/Meta, not by JunctionShare servers.',
  },
  {
    heading: 'Data retention',
    body: 'On-device profile data remains until you clear app data or uninstall. Because profile fields are not stored on a JunctionShare server, there is no cloud profile to delete with us. Questions: hello@rydio.app.',
  },
];
