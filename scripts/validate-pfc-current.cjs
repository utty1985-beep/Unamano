/* Validate the modules actually referenced by the production entry point. */
const {execFileSync}=require('node:child_process');
for(const test of ['scripts/test-pfc-offline-worker.cjs','scripts/test-pfc-offline-cloud.cjs','scripts/test-pfc-history-20261016.cjs','scripts/test-pfc-review-20261015.cjs','scripts/test-pfc-auth-20261016.cjs','scripts/test-wind-engine-6.9.3.cjs','scripts/test-native-team-background-6.9.9.cjs','cacciatraccia/tools/test-alerts-6.8.0.cjs'])execFileSync(process.execPath,[test],{stdio:'inherit',env:process.env});
