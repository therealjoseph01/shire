// Official Shire assets, served from Shire's own CDN (the live site's Framer asset host).
// `npm run assets` downloads them into /public/shire so production can self-host; set VITE_SELF_HOST=1 to use the local copies.
const CDN = 'https://framerusercontent.com'
const local = import.meta.env && import.meta.env.VITE_SELF_HOST === '1'
const u = (path, file) => (local ? `/shire/${file}` : `${CDN}${path}`)

export const ASSETS = {
  logo: u('/images/2mQFWY0zLs0tIFFu4dWopVNeiI.png', 'logo-mark.png'),
  cctv: u('/images/n9nzffySWhKrwpeAfRqoYr09w.gif', 'cctv-table-zones.gif'),
  host: u('/images/SoK4g0jTqQsok9lDFPTm92K2XAQ.gif', 'host-floor.gif'),
  interior: u('/images/WVhP02mVPhddMjD7s3YH1qRN2hw.png', 'interior.png'),
  og: u('/assets/hGORGDrGpph9FCtuqfHHM8fldI.jpg', 'og.jpg'),
}

export const LINKS = {
  demo: 'https://shireintelligence.com/contact-us',
  savings: 'https://shireintelligence.com/benefits',
  privacy: 'https://shireintelligence.com/privacy-policy',
  terms: 'https://shireintelligence.com/terms-of-use',
  linkedin: 'https://www.linkedin.com/company/shireintelligence',
  x: 'https://x.com/ShireIntel',
  youtube: 'https://www.youtube.com/@ShireIntelligence',
  video: 'https://www.youtube.com/watch?v=d0Y4GISLv2I',
}
