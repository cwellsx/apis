# Installation

- [Source code](#source-code)
- [Local certificate error](#local-certificate-error)

## Source code

Installing the project's source code, to build it locally, should be simple:

```
git clone https://github.com/cwellsx/apis.git
cd apis
npm install
```

## Local certificate error

Electron includes binaries as well as an npm package.

The binaries are hosted and installed from GitHub, for example a page like this:

- https://github.com/electron/electron/releases/tag/v28.2.0

When you run `npm install` you may see an error message related to a local certificate:

```
RequestError: unable to get local issuer certificate
```

There are many questions and answers about this online --
I fixed it as follows (but please tell if these instructions can be improved):

- Use Chrome to export the certificate for GitHub's root authority:

  ![Alt text](./screenshots.tiny/Screenshot%202024-01-28%20072503.png)

  - Navigate to the page using Chrome
  - Open Developer Tools
  - Go to Security/View Certificate/Details
  - Click on the root of the tree i.e. `DigiCert Global Root CA`
  - Click "Export..."
  - Save the file on your machine, using the "Base-64 encoded ASCII" format

- Run `npm config get cafile` to verify that this value is currently `null` before you change it
- Set the `cafile` value to the path of the new `*.crt` file, which you saved on your machine
