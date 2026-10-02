import {parentPort} from 'node:worker_threads';
import {attachStartupWorker} from './countryStartResidenceWorkerHost';

if(!parentPort)throw Error('Country Start requires a dedicated Node worker.');
const port=parentPort;
attachStartupWorker(handler=>port.on('message',handler),reply=>port.postMessage(reply));
