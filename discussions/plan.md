plan to get a working mvp:

[✅] data set
[✅] data ingestion part
[✅] stitch info
[ ] Detectors
    [✅] Building 5 starting Detectors
    [✅] DetectorManager
    [✅] use MechanismToFilterDecetors
        [✅] AllDetectorsFilter extends MechanismToFilterDecetors
    [✅] Bulding a loop to get data through all
    [✅] for each dectector stitch info
    [✅] generate
[ ] get generated data, and send back to request being made

run 
    get data
    run detector manager through filter
        run manually made declared detectors
        if failed run auto analyzing detectors
        if that fails aswell run ai powered detector
        
        //so for each action run manual detector -> analyzer -> ai detector

    get the final results for the actions
    run profile/comunity builder
    sent data to the generator and personalize based on user interests/community interests

    send generated message



NEAR FUTURE
[ ] this api call we make to the backend will be wrapped on an sdk
[ ] project settings will be set on another endpoint
[ ] webhook support
[ ] cron support


LATE FUTURE
[ ] DetectorBuilder
    [ ] create special syntax to filter by markers
    [ ] make builders composable(can intertwine) by nature
    [ ] make sure to follow builder pattern ()
    [ ] 
[ ] MechanismToFilterDecetors
[ ] MechanismToFilterDecetors Builder




Code for DetectorBuilder:
builder1 = new DetectorBuilder(seedData1);
builder2 = new DetectorBuilder(seedData2);
builder1.addMarker(`x or y`);
builder2.addMarker(`z or d`);

const builder3 = builder1.compose(builder2);  // returns a new instance of DetectorBuilder;

const builder4 = builder3.clone().addMarker(`x or y`).build();