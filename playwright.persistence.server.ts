import {mergeConfig} from 'vite';
import original from './vite.config';
// Domain/persistence probes import additional cold source graphs. Dependency
// discovery must not replace their document mid-transaction through development
// live reload. Actual UI/dev Worker tests use the ordinary, unmodified server.
export default mergeConfig(original,{server:{hmr:false}});
