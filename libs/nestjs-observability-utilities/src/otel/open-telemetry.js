/**
 * Starts open telemety sdk.
 *
 * This has to be started even before nestjs is imported,
 * so it doesn't fit into the normal nestjs lifecycle.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const {
  getNodeAutoInstrumentations,
} = require('@opentelemetry/auto-instrumentations-node');
const {
  SemanticResourceAttributes_SERVICE_NAME,
  SemanticResourceAttributes_SERVICE_VERSION,
  SemanticResourceAttributes_HOST_NAME,
} = require('@opentelemetry/semantic-conventions');
const { hostname } = require('os');
// TODO how do we find the right package.json?
//const { name, version } = require('./package.json');

// we need to initialize the sdk before bootstapping nestjs
const sdk = new NodeSDK({
  //autoDetectResources: false,
  resource: new Resource({
    // FIXME this may not work for `node dist/main`
    [SemanticResourceAttributes_SERVICE_NAME]: process.env.npm_package_name,
    [SemanticResourceAttributes_SERVICE_VERSION]: process.env.npm_package_version,
    [SemanticResourceAttributes_HOST_NAME]: hostname(),
  }),

  instrumentations: [
    getNodeAutoInstrumentations({
      // disable noisy and unnecessary fs instrumentation
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // disable express, since we really just need the http and nestjs info
      '@opentelemetry/instrumentation-express': { enabled: false },
    }),
  ],
});

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry
sdk.start();
// set a global variable so you can call `await otelGlobal.sdk.shutdown();`
global.otelGlobal = global.otelGlobal || {};
global.otelGlobal.sdk = sdk;
//console.debug('Tracing initialized');

// gracefully shut down the SDK on process exit
// FIXME shuts down too early and we lose spans either way. can we shut it down from nestjs?
//async function cleanup(signal) {
//  // even with `once` instead of `on`, this runs twice
//  process.removeListener('SIGTERM', cleanup);
//  try {
//    await sdk.shutdown();
//    //console.debug('Tracing terminated');
//  } catch (error) {
//    console.warn('Error terminating tracing', error);
//  }
//  // process.exit prevents a graceful NestJS shutdown, but... is this correct?
//  process.kill(process.pid, signal);
//}
//process.on('SIGTERM', cleanup);
