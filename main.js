window.onload = init
function init(){ 
    //// SETUP MAP, LAYERS, DOM
    const defaultProjections = ['EPSG:4326', 'EPSG:3857'],
    epsg = defaultProjections[1],
    VicCenter = [145.5, -37],
    VicExtent = [137, -52, 153, -20],
    map = new ol.Map({
        view: new ol.View ({
            // zoom: 6.8,
            projection: epsg, //// WGS84
            center: ol.proj.fromLonLat(VicCenter),
            extent: ol.proj.transformExtent(VicExtent, 'EPSG:4326', epsg) //// from LatLon
        }),
        target: 'ol-map',
        keyboardEventTarget: document,
        controls: ol.control
            .defaults({attribution: false}) //// first remove attribution
            .extend([new ol.control.Attribution({collapsible: true}) ]) //// then to set new and add collapsible true
    })
        
    map.getView().fit(ol.proj.transformExtent(VicExtent, 'EPSG:4326', epsg), map.getSize());

    //// STYLES
    var waterfallStyleCache = {};
    const waterfallStyle = function (feature) {
        const number = feature.get('features').length
        var style = waterfallStyleCache[number];
            if (!style) {
            style = new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 10,
                    stroke: new ol.style.Stroke({
                        color: '#fff',
                    }),
                    fill: new ol.style.Fill({
                        color: '#FF3492',
                    }),
                }),
                text: new ol.style.Text({
                    text: number.toString(),
                    fill: new ol.style.Fill({
                        color: '#fff',
                    }),
                }),
            });
            waterfallStyleCache[number] = style;
        }
        feature.setStyle([style]);
    },
    RainStationStyle = function(feature){
        const max = 30,
        // color = d3.interpolateBlues(Math.min(1, feature.get('sum')/max)).match(/\d+/g).map(Number),
        alpha = Math.max(0.2, Math.min(1, feature.get('sum')/max)),
        text = new ol.style.Style({
            text: new ol.style.Text({
                text: feature.get('sum').toFixed(1).toString(),
                font: 'bold 14px sans-serif',
                textAlign: 'center',
                textBaseline: 'top',
                offsetX: -10,
                offsetY: 10,
                textAlign: 'left',
                fill: new ol.style.Fill({
                    color: '#FF3492',
                }),
                // stroke: new ol.style.Stroke({
                //     color: 'black',
                // }),
            }),
        }),
        icon = new ol.style.Style({
            image: new ol.style.Icon({
                src: './img/drop.png',
                // opacity: alpha,
                scale: 0.2,
                // color: color,
            }),
        });
        feature.setStyle([icon, text]);
    },
    VictoriaStateStyle = function(feature){
        const lineStyle = new ol.style.Style({
            stroke : new ol.style.Stroke({
                color: 'rgba(0,0,255,0.5)',
                width: 1,
            })
        })
        feature.setStyle([lineStyle]);
    }

    //// BASE MAPS
    const basemaps = new ol.layer.Group({ 
        title: 'Base Maps',
        control: 'radiobutton',
        layers: [
            new ol.layer.Tile({title: 'Toner Light',
                visible: true,
                zIndex: 1,
                source: new ol.source.Stamen({
                    layer: 'toner-lite',
                })                   
            }),
            new ol.layer.Tile({ title: 'OSM Standard',
                visible: true,
                zIndex: 1,
                source: new ol.source.OSM({
                    url: 'https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png' //// humanitarian layer
                }),
            }),
        ]
    });
    map.addLayer(basemaps);
    addGroupToSidebar(basemaps, 'sidebar-content');

    const hillshadeLayer = new ol.layer.Tile({ title: 'Hillshade',
        visible: true,
        zIndex: 1,
        source: new ol.source.TileJSON({
            url: 'https://api.maptiler.com/tiles/hillshades/tiles.json?key=nYEu7jmRracSooqhws7a',
            tileSize: 256,
            crossOrigin: 'anonymous',
            attributions: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
        }),
    });
    map.addLayer(hillshadeLayer);
    addLayerToGroupSidebar(hillshadeLayer, basemaps);

    const victoriaLayer = new ol.layer.Vector({title: 'Victoria State',
        visible: true,
        zIndex: 3,
        source: new ol.source.Vector({
            url: './data/victoria_s.topojson',
            format: new ol.format.TopoJSON()
        }),
        style: VictoriaStateStyle
    });
    map.addLayer(victoriaLayer);

    //// CREATE GROUPS AND LAYERS
    const layerGroups = [               
        {title: 'VIC Waterfalls', 
            control: 'checkbox',
            selectAll: true,
            selectAllOnly: false,
            layers: [
                new ol.layer.Vector({title: 'Waterfalls',
                    visible: true,
                    zIndex: 10,
                    source: new ol.source.Cluster({
                        distance: 40,
                        source: new ol.source.Vector({
                            features: []
                        })
                    }),
                    type: 'featureLayer',
                    filename: 'waterfalls.csv',
                    alt: 'Victoria Waterfalls',
                    dataFunction: function(data){     
                        var featuresArray = [];
                        data.data.forEach(function(f) {       
                            featuresArray.push({'type': "Feature",
                                'geometry': {
                                    'coordinates': [f['lon'], f['lat']],
                                    },
                                'properties': {
                                    "location": f['location'],
                                    "name": f['name'],
                                    "height": f['height'],
                                }
                            })
                        });
                        return featuresArray;
                    }, 
                    popupHTML: function(feature){
                        var features = feature.get('features'),
                        html = ''
                        // ${ol.proj.toLonLat(feature.getGeometry().getCoordinates())}
                        features.forEach(function(f){
                            let featureName = f.get("name"),
                            featureLoc = typeof f.get("location") != undefined ? `<span style="font-size: 0.8em">${f.get("location")}</span></br>` : '',
                            featurePos = feature.get('features')[0].getGeometry().getCoordinates()
                            console.log(featurePos)
                            html += `<p><span style="font-weight:bold">${featureName}</span></br>` 
                                + featureLoc
                                + `<a href="https://www.facebook.com/groups/298109134008513/search/?q=${featureName}" target="_blank" style="text-decoration: none;">
                                    find in "Victoria's waterfalls"</a></br>
                                <span class="find-place blue" coords="${featurePos}" style="cursor: pointer;">
                                    find on the map  <i class="fas blue fa-search-location"></i></span></br>
                                <a href="http://maps.google.com/maps?q=${ol.proj.toLonLat(featurePos).reverse().join(',')}" target="_blank" style="text-decoration: none;">
                                    find in Google Maps</a></p>
                                <hr>`;
                        })
                        return html;
                    },
                    style: waterfallStyle
                }),
            ]
        },
        {title: 'Rain',
            control: 'checkbox',
            selectAll: false,
            selectAllOnly: false,
            layers: [
                new ol.layer.Vector({title: 'Rain Stations',
                    visible: false,
                    zIndex: 4,
                    source: new ol.source.Vector({
                        attributions: 'http://www.bom.gov.au//',
                        features: []
                    }),
                    type: 'featureLayer',
                    filename: 'rain_stations.csv',
                    alt: 'BOM weather stations collecting rain data',
                    dataFunction: function(data){     
                        var featuresArray = [];
                        data.data.forEach(function(f) {       
                            const filtered = Object.keys(f).filter(key => key.includes('/')),
                            rain = filtered.map(function(key) {return {'date': key, 'value': f[key]}})
                            featuresArray.push({'type': "Feature",
                                'geometry': {
                                    'coordinates': [f['lon'], f['lat']],
                                },
                                'properties': {
                                    "station": f['station'],
                                    "name": f['name'],
                                    "rain": rain,
                                    'sum' : rain.map(x => +x.value).reduce((a, b) => a + b, 0)
                                }
                            })
                        });
                        return featuresArray;
                    }, 
                    popupHTML: function(feature){
                        let featureName = feature.get("name").capitalize(),
                        featureSum = feature.get("sum").toFixed(1),
                        featureStation = feature.get("station"),
                        featureRain = feature.get('rain').map(x => `${x.date}: <span style="font-weight: 600;">${(+x.value).toFixed(1)} mm</span>`)
                        return `<p>Rain Station: <span style="font-weight:bold">${featureName}</br></span>
                            Rain past 7 days: <span style="font-weight: 600;">${featureSum} mm</span></br>
                            <a href='http://www.bom.gov.au/jsp/ncc/cdio/wData/wdata?p_nccObsCode=136&p_display_type=dailyDataFile&p_stn_num=${featureStation}&p_startYear=' target="_blank">BOM data</a></br>
                            ${featureRain.join('</br>')}</p>
                            <hr>`;
                    },
                    style: RainStationStyle
                }),
                new ol.layer.Image({title: "Rain Accumulation",
                    visible: false,
                    zIndex: 2,
                    type: 'image',
                    filename: 'rain_stations.csv',
                    alt: 'Raster Image of the amount of rain accumulated over the past 7 days',
                    dataFunction: function(data){     
                        var featuresArray = [];
                        data.data.forEach(function(f) {       
                            const filtered = Object.keys(f).filter(key => key.includes('/'))    
                            var rain = filtered.map(function(key) {return {'date': key, 'value': f[key]}})
                            featuresArray.push({'type': "Feature",
                                'geometry': {
                                    'coordinates': [f['lon'], f['lat']],
                                },
                                'properties': {
                                    "station": f['station'],
                                    "name": f['name'],
                                    "rain": rain,
                                    'sum' : rain.map(x => +x.value).reduce((a, b) => a + b, 0)
                                }
                            })
                        });
                        return featuresArray;
                    },
                    sourceFunction: function(layer){
                        //// CREATE CANVAS
                        const id = `${layer.get('title').htmlSafe()}-canvas`,
                        width  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
                        height = window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight,
                        canvas = d3.select("body").append("canvas")
                            .attrs({
                                'id': id,
                                'width': width,
                                'height': height
                            })
                            .styles({
                                'position':'absolute',
                                'top': '0',
                                'left': '0',
                                'visibility': 'hidden',
                                'pointer-events': 'none'
                            })
                       
                        // ///// CHECK IF PNG ALREADY EXISTS
                        // const today = new Date()
                        // const yesterday = new Date(today)
                        // yesterday.setDate(yesterday.getDate() - 1)
                        
                        // var pngFileName = `data/png/rain_${formatDateNumbers(yesterday)}.png`
                        // var context = canvas.node().getContext("2d")
                        // $.get(pngFileName)
                            // .done(function() { //// IF FILE EXISTS LOAD TO CANVAS
                            //     console.log(pngFileName + ' exists')
                            //     let base_image = new Image();
                            //     base_image.src = pngFileName;

                            //     base_image.onload = function(){

                            //         console.log( this.width, this.height );
                            //         console.log( width, height );

                            //         context.drawImage(base_image, (width - this.width)/2, (height - this.height)/2, this.width, this.height);
                            //         var imageData = canvas.node().toDataURL("image/png")


                            //         layer.setSource(new ol.source.ImageStatic({
                            //             imageExtent: map.getView().calculateExtent(),
                            //             imageLoadFunction : function(image){
                            //                 image.getImage().src = imageData;
                            //             }
                            //         }))
                            //     }
                            // })
                            // .fail(function() { //// IF FILE DOESN"T EXIST CREATE, SAVE, LOAD TO CANVAS
                                gradientImage = new GradientMap(id)

                                var pointsT = layer.data.map(function(p){
                                    return {
                                        x: projectCoord(p.geometry.coordinates)[0],
                                        y: projectCoord(p.geometry.coordinates)[1],
                                        value: p.properties.sum
                                    }
                                })
                                gradientImage.setPoints(pointsT, width, height);
                                var PolygonT = layer.polygon.map(function(p){
                                    return {
                                        x: projectCoord(p)[0],
                                        y: projectCoord(p)[1],
                                        value: 0
                                    }
                                })
                                gradientImage.polygon = PolygonT
                                // gradientImage.drawFull(true, function () {  });
                                // gradientImage.drawLow(5, 5, false, function () { gradientImage.drawPoints() });
                                gradientImage.drawLow(5, 2, false, 230, function() { });

                                // var pngImageData = canvas.node().toDataURL("image/png");
                                // $.ajax({
                                //     url:"save_png.php",
                                //     data:{
                                //       base64: pngImageData
                                //     },
                                //     type:"post",
                                //     success: function(returnData){
                                //         console.log(returnData);
                                //     },
                                //     // complete:function(){
                                //     // },
                                //     error: function(xhr, status, error){
                                //         var errorMessage = xhr.status + ': ' + xhr.statusText
                                //         alert('Error - ' + errorMessage);
                                //     }
                                // });

                                layer.setSource(new ol.source.ImageStatic({
                                        imageExtent: map.getView().calculateExtent(),
                                        imageLoadFunction : function(image){
                                            image.getImage().src = gradientImage.getImage();
                                        }
                                    })
                                )
                            // })
                    },
                }),
            ]
        }
    ]
    layerGroups.forEach(function(g){
        const group = new ol.layer.Group(g)
        map.addLayer(group) 
        addGroupToSidebar(group, 'sidebar-content')
    })

    //// SETUP DOM
    //// TOOLTIPS
    // $('[title]').tooltip({ trigger: "hover" });

    //// TOOLS SIDEBAR 
    setToolsSidebar();
    
    ///// POPUP
    var popup = new ol.Overlay({
        element: document.getElementById('popup-container'),
        autoPan: true,
        zIndex: 100,
        // offset: [0, -8],
        autoPanAnimation: { duration: 500 },
    });
    map.addOverlay(popup);
    $('#popup-closer').on('click', e => popup.setPosition(undefined))

    map.on('click', e => clickHandlerOL(e))

    //// ===========================================================
    //// READ DATA FILES AND SORT LAYER TYPES
    var dataLayers = layerGroups.map(x=> x.layers).flat().filter(x => typeof x.get('filename') != 'undefined'),
        D3Layers = dataLayers.filter(x => x.get('type') == 'D3'),
        imageLayers = dataLayers.filter(x => x.get('type') == 'image'),
        featureLayers = dataLayers.filter(x => x.get('type') == 'featureLayer'),
        dataFiles = [...new Set(dataLayers.map(x => x.get('filename')))],
        promises = []
    dataFiles.push('victoria_s.json') //// used for rain accumulation polygon

    dataFiles.forEach(function(filename) {
        if(filename.split('.')[1] == 'csv'){
            var url = d3.csv(`./data/${filename}`);
        } else if (filename.split('.')[1].includes('json')){
            var url = d3.json(`./data/${filename}`);
        }
        promises.push(url.then(
            function(data) {return {success: true, filename: filename, data: data}}, 
            function() {return {success: false, filename: filename}}
        ))
    });
    // console.log('Data layers: ', dataLayers.map(x => x.get('title')))
    // console.log('D3 layers: ', D3Layers.map(x => x.get('title')))
    // console.log('Feature layers: ', featureLayers.map(x => x.get('title')))

    /// MAIN FUNCTION AFTER DATA IMPORT
    Promise.all(promises).then(function(collection) {      
        // console.log(collection);
        //// ATTACH DATA TO EACH LAYER AS .data property for further use as features       
        dataLayers.forEach(function(layer){
            var data_raw = collection.filter(d => d.filename === layer.get('filename'))[0]
            if (data_raw){
                var features = layer.get('dataFunction')(data_raw);
                layer.data = features;
            };
        })

        //// CREATE FEATURES AND ADD TO FEATURE LAYERS
        featureLayers.forEach(function(layer, i){
            var newFeatures = layer.data.map(f => createFeature(f))
            if(layer.getSource() instanceof ol.source.Cluster){
                layer.getSource().getSource().addFeatures(newFeatures); //// source inside source for Cluster layers
            } else {
                layer.getSource().addFeatures(newFeatures);  
            }
        })

        //// CREATE IMAGE FOR IMAGE LAYERS ON LAYER SELECTION
        $( "#rain-accumulation" ).one( "click", function() {
            map.getView().fit(ol.proj.transformExtent(VicExtent, 'EPSG:4326', epsg), map.getSize()); //// have to see full map to create image

            //// CREATE PNG IMAGE
            imageLayers.forEach(function(layer, i){
                if(layer.get('title') == 'Rain Accumulation'){
                    layer.polygon = collection.filter(x => x.filename == 'victoria_s.json')[0].data.geometries[0].coordinates[0][0];
                }
                $('#loading').show();
                setTimeout(function() {
                    layer.get('sourceFunction')(layer)
                    $('#loading').hide();
                }, 0);
            })

            //// ADD COLOR LEGEND TO RAIN ACCUMULATION LAYER
            const height = window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight,
            legendDimensions = {width: 10, height: Math.min(height - 220, 150), top: 100, bottom: 65, left: 5, right: 15 };
            colorLegend('legend', {'>30mm': 'rgb(0, 0, 255)', '0mm': 'rgb(255,255,255)'}, legendDimensions);
            map.on('postrender', function(){
                const legend = d3.select('#legend'),
                layer = imageLayers.filter(x => x.get('title') == 'Rain Accumulation')[0]
                ///// SET UNVISIBLE IF LAYER IS UNVISIBLE
                !layer.get('visible') ? legend.style("visibility", "hidden") : legend.style("visibility", "visible");
            })
            window.addEventListener("resize", function(){
                const width  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
                height = window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;
                d3.select('#legend').select('g').attr('transform', `translate(${width - legendDimensions.right - legendDimensions.width}, ${height - legendDimensions.bottom - legendDimensions.height})`);
            });
        });

        //// ADD THE LIST OF THE WATERFALLS TO THE INFO
        const waterfalls = collection.filter(d => d.filename === "waterfalls.csv")[0].data.sort((a, b) => d3.ascending(a.name, b.name))
        d3.select('#info-content').selectAll('p').data(waterfalls)
            .enter()
            .append('p')
            .attr('class', 'title')
            .each(function(d){
                // var coords = projectCoord([d.lon, d.lat])
                var coords = ol.proj.fromLonLat([d.lon, d.lat], epsg)
                d3.select(this)
                    .append('span')
                    .attrs({
                        'class': "find-place blue",
                        "coords": coords
                    })
                    .style('cursor', 'pointer')
                    .text(d.name)
        })
        // $('p').tooltip({ trigger: "hover" }) 

        ///// FIND ON THE MAP
        $("#info-content, #popup-content").on('click', '.find-place', function() {
            const coords = $(this).attr("coords").split(',').map(d => parseFloat(d))
            const name = $(this).text().includes('find on the map') ? $(this).closest('p').find('span').html() :  $(this).text()
            map.getView().animate({
                projection: epsg, //// WGS84
                center: coords,
                zoom: 13,
                duration: 2000,
            });

            //// create new popup for the item
            popup.setPosition(undefined);
            var html = `<p><span style="font-weight:bold">${name}</span></br>
            <a href="https://www.facebook.com/groups/298109134008513/search/?q=${name}" target="_blank" style="text-decoration: none;">
                find in "Victoria's waterfalls"</a></br>
            <a href="http://maps.google.com/maps?q=${ol.proj.toLonLat(coords).reverse().join(',')}" target="_blank" style="text-decoration: none;">
                find in Google Maps</a>                
                </br>`
            $('#popup-content').empty();
            $('#popup-content').append(html);
            if($('#popup-content').html() != ''){popup.setPosition(coords)};
        });

    });

    ///// ===========================================================
    //// FUNCTIONS
    function createFeature(feature){ ///// CREATE OL FEATURE FROM GEOJSON FEATURE
        ///// CREATE FEATURE AND ADD PROPERTIES
        var f = new ol.Feature();
        for (var key in feature.properties){
            f.set(key, feature.properties[key])
        }
        ///// SELECT GEOMETRY OF FEATURE DEPENDING ON DATA
        // console.log(feature)
        // console.log(feature.geometry.type)
        if(feature.geometry.type == 'Polygon'){
            f.setGeometry( new ol.geom.Polygon(feature.geometry.coordinates));
        } else if(feature.geometry.type == "MultiPolygon"){
            f.setGeometry( new ol.geom.MultiPolygon(feature.geometry.coordinates));
        } else if(feature.geometry.type == 'MultiPoint'){
            f.setGeometry( new ol.geom.MultiPoint(feature.geometry.coordinates));
        } else if(feature.geometry.type == 'LineString'){
            f.setGeometry( new ol.geom.LineString(feature.geometry.coordinates));
        // } else if(feature.geometry.type == 'Point'){
        //     f.setGeometry( new ol.geom.Point(feature.geometry.coordinates));
        } else {
            f.setGeometry( new ol.geom.Point(feature.geometry.coordinates));
        }
        //// TRANSFORM GEOMETRY
        f.getGeometry().transform('EPSG:4326', epsg);
        return f;
    };

    function setToolsSidebar(){
        const screenHeight = $(window).height(),
        screenWidth = $(window).width(),
        sliderHeight = 0,
        margin = 5,
        firstLevelWidth = 250,
        secondLevelWidth = 250,
        levels = {
            first: [
                {id: "sidebar",
                width: firstLevelWidth,
                top: 0,
                height: screenHeight - sliderHeight - 2*margin,
                function: function(){
                    const secondLevelIDs = levels.second.map(d => `#${d.id}-container, #${d.id}-toggler`).join(', ');
                    if($(`#${this.id}-container`).hasClass('open')){                          
                        $(secondLevelIDs).each(function(){
                            $(this).animate({"left": `+=${secondLevelWidth + margin}`}, 250);
                        })
                    }else{
                        $(secondLevelIDs).each(function(){
                            $(this).animate({"left": `-=${secondLevelWidth + margin}`}, 250);
                        })
                    }
                }}
            ],
            second:[
                {id: "info",
                width: secondLevelWidth,
                top: 50 - margin,
                height: screenHeight - sliderHeight - 100 - margin,
                function: function(){}
                }
            ]
        }

        //// APPLY CSS
        levels.first.forEach(function(e){
            $(`#${e.id}-container`)
                .css('top', `${e.top}px`)
                .css('width', `${e.width}px`)
                .css('height', `${e.height}px`);
            if($(`#${e.id}-container`).hasClass('open')){
                $(`#${e.id}-container`).css('left', `${margin}px`);
            } else {
                $(`#${e.id}-container`).css('left', `${-e.width}px`);
            }
            $(`#${e.id}-toggler`).css('top', `${e.top}px`);
        })
        levels.second.forEach(function(e){
            $(`#${e.id}-container`)
                .css('top', `${e.top}px`)
                .css('left', `${-e.width}px`)
                .css('width', `${e.width}px`)
                .css('height', `${e.height}px`);
            $(`#${e.id}-toggler`).css('top', `${e.top}px`);
        })
        $('.panel-scroller').each(function(){
            var height = $(this).parent().height() - $(this).position().top - $(this).parent().position().top;
            $(this).css('height', height);
        })
        ///// TOGGLE ACTIONS
        levels.first.forEach(function(o){
            $(`#${o.id}-toggler, #${o.id}-closer`).each(function(){
                $(this).on('click', function(e) {
                    e.preventDefault();
                    $(`#${o.id}-container`).toggleClass("open");
                    if($(`#${o.id}-container`).hasClass('open')){                         
                        $(`#${o.id}-container`).animate({"left": `${margin}`}, 250);
                    }else{
                        $(`#${o.id}-container`).animate({"left":  `-${o.width}`}, 250);
                    }
                    o.function()
                });
             })  

        })
        levels.second.forEach(function(o){
            $(`#${o.id}-toggler, #${o.id}-closer`).each(function(){
                $(this).on('click', function(e) {
                    e.preventDefault();
                    $(`#${o.id}-container`).toggleClass("open");
                    if($(`#${o.id}-container`).hasClass('open')){       
                        $(`#${o.id}-container`).animate({"left": `+=${o.width + margin}`}, 250);
                    }else{
                        $(`#${o.id}-container`).animate({"left": `-=${o.width + margin}`}, 250);
                    }
                    o.function()
                });
            })
        
        })   
        //// SIMULATE BUTTON CLICKS FOR INITIAL STATE
        // $("#info-toggler").click()
    };

    function addLayerToGroupSidebar (layer, group){
        const groupTitle = group.get('title'),
        layerTitle = layer.get('title'),
        groupID = groupTitle.htmlSafe(),
        layerID = layerTitle.htmlSafe(),
        alt = typeof layer.get('alt') === 'undefined' ? layerTitle : layer.get('alt');
        container = $(`#${groupID}`)
        container.tooltip({ trigger: "hover" }) 
        container.append(`<input type="checkbox" name='${groupID}-checkbox' id='${layerID}' value='${layerID}'>
            <label for=${layerID} title=${alt}>${layerTitle}</label><br>`)
        container.find(`#${layerID}`)
            .prop("checked", layer.get('visible')) //// set initial state depending on layer settings
            .on('change', function() {
                var checked = $(this).is(':checked');
                layer.setVisible(checked)
            });
    };

    function addGroupToSidebar(group, elementID){  ///// ADDS GROUP OF LAYERS TO SIDEBAR WITH RADIO OR CHECKBOX
        const control = group.get('control'),
        groupTitle = group.get('title'),
        groupID = groupTitle.htmlSafe();
        $(`#${elementID}`).append(`<h3 id=${groupID}-title style="cursor: pointer;"><i class="fas arrow fa-angle-double-down"></i> ${groupTitle}</h3>`);
        let a = $(`#${groupID}-title`);
        $(`#${elementID}`).append(`<div id=${groupID} style="display:none;"></div>`);
        let container = $(`#${groupID}`);
        container.tooltip({ trigger: "hover" }) 

        a.on('click', function(){
            if (container.is( ":hidden" )) {
                container.slideDown();
                a.html(`<i class="fas arrow fa-angle-double-up"></i> ${groupTitle}`);
            } else {
                container.slideUp();
                a.html(`<i class="fas arrow fa-angle-double-down"></i> ${groupTitle}`);
            }
        })

        //// CREATE radiobuttons or checkboxes
        if (control == 'checkbox'){
            //// ADD SELECT ALL CHECKBOX
            if(group.get('selectAll') && group.getLayers().getArray().length > 1){
                container.append(`<input type="checkbox" name='select-all' id='select-all-${groupID}' value='select-all-${groupID}' ${group.get('selectAllOnly') ? 'checked' : ''}>
                    <label for='select-all-${groupID}' title='Select All'>Select All</label></br>`)
                $(`#select-all-${groupID}`).on('change', function(){
                    var checked = $(this).is(':checked')
                    container.find('input:checkbox').not(this).prop('checked', this.checked);  
                    group.getLayers().forEach((layer) => {
                        layer.setVisible(checked)
                    })
                });
            }
            if (!group.get('selectAllOnly')){
                ///// ADD CHECKBOX FOR EACH LAYER
                group.getLayers().getArray().forEach((layer, i) => {
                    let title = layer.get('title'),
                    value = title.htmlSafe(),
                    alt = typeof layer.get('alt') === 'undefined' ? title : layer.get('alt');
                    container.append(`<input type="checkbox" name='${groupID}-checkbox' id='${value}' value='${value}'>
                        <label for=${value} title="${alt}">${title}</label><br>`)
                    container.find(`#${value}`)
                        .prop("checked", layer.get('visible')) //// set initial state depending on layer settings
                        .on('change',function() {
                            var checked = $(this).is(':checked')
                            layer.setVisible(checked)
                        });
                })  
            }
        } else {
            group.getLayers().forEach((layer, i) => {
                let title = layer.get('title'),
                value = title.htmlSafe(),
                alt = typeof layer.get('alt') === 'undefined' ? title : layer.get('alt');
                container.append(`<input type="radio" name='${groupID}RadioButton' id='${value}' value='${title.htmlSafe()}'>
                <label for=${value} title="${alt}">${title}</label><br>`)
                container.find($(`:input[value="${title.htmlSafe()}"]`)).prop("checked", layer.get('visible'))
            })
            container.find('input').on('click', function() {
                let title = $(this).val()
                group.getLayers().forEach(function(layer, index, array){
                    let layerTitle = layer.get('title').htmlSafe()
                    layer.setVisible(layerTitle === title)
                })
            });
        }
    };

    function projectCoord(LonLat) { //// PROJECTS LONLAT TO PIXELS
        // console.log(LonLat)
        if (epsg === "EPSG:4326"){
            var projected = map.getPixelFromCoordinate(LonLat);
        } else {                
            const fromLonLat = ol.proj.getTransform('EPSG:4326', epsg), //// function converting from LonLat to current EPSG
            coordsLocal = fromLonLat(LonLat.slice(0,2))
            var projected = map.getPixelFromCoordinate(coordsLocal);
        }
        return projected;
    };

    function clickHandlerOL(e){
        // console.log(e)
        // console.log(epsg)
        // console.log('zoom', map.getView().getZoom())
        // console.log('click coord', e.coordinate)
        // console.log('click pixel', e.pixel)
        // console.log('click coord LonLat',  ol.proj.toLonLat(e.coordinate))
        // console.log('calculated pixel clicked', map.getPixelFromCoordinate(e.coordinate))

        popup.setPosition(undefined);
        $('#popup-content').empty();
        var bounds;
        // var canvasContext = d3.select('#rain-accumulation-canvas').node().getContext('2d'); 
        // var pixelAtClick = canvasContext.getImageData(e.pixel[0], e.pixel[1], 1, 1).data;
        // // var val = (-4*blue*blue/100000  + 0.008*blue + 0.5).toFixed(1)
        // console.log(pixelAtClick[0], pixelAtClick[1], pixelAtClick[2])

        map.forEachFeatureAtPixel(e.pixel, function(feature, layer){
            bounds = feature.getGeometry().extent_;
            var popup = layer.get('popupHTML');
            try { var html = popup(feature); }
            catch { var html = ``; }
            $('#popup-content').append(html);
        },
        //// FILTER LAYERS TO SHOW OR COMMENT OUT TO CHOOSE ALL LAYERS
        // {layerFilter: function(layerToShow){return layerToShow.get('title') === 'Heatmap from GeoJSON'}}
        )  
        $('#popup-content hr:last-child').remove();
        if($('#popup-content').html() != ''){popup.setPosition(e.coordinate)}   
    }; 

    function colorLegend(id, params, dimensions){
        // use same margins as main plot
        const width  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
        height = window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;
    
        ///// CREATE SVG IN DOESN'T EXIST
        if (d3.selectAll(`#${id}`).nodes().length == 0){
            // var div = d3.select('.ol-viewport').insert('div', '.ol-overlaycontainer').attr('id', id).attr('class', 'svg-container')
            const div = d3.select('#ol-map').append('div')
                .attr('id', id)
                .attr('class', 'svg-container')
                .styles({
                    'position': 'absolute',
                    'pointer-events': 'none',
                    'top': '0',
                    'left': '0',
                    'width': '100%',
                    'height': '100%',
                    'z-index': '100'
                })
            var svg = div.append("svg")
                .attr('id', `${id}-svg`)
                .attr('class', 'd3-charts')
                .attr('width', '100%')
                .attr('height', '100%')
        } else {
            var svg = d3.select(`#${id}-svg`)
        }
    
        const colors = Object.values(params),
        text = Object.keys(params);
        // var containerG = svg.selectAll(`#${id}-container`)
    
        const grad = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'grad')
            .attr('x1', '0%')
            .attr('x2', '0%')
            .attr('y1', '0%')
            .attr('y2', '100%');
        
        grad.selectAll('stop').data(colors)
            .enter()
            .append('stop')
            .style('stop-color', d => d)
            .attr('offset', (d,i) => 100 * (i / (colors.length - 1)) + '%' )
    
        const containerG = svg.append('g')
            .attr('transform', `translate(${width - dimensions.right - dimensions.width}, ${height - dimensions.bottom - dimensions.height})`);
        
        containerG.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', dimensions.width)
            .attr('height', dimensions.height)
            .styles({
                'stroke': 'black',  
                'fill': 'url(#grad)'
            });

        containerG.selectAll('text').data(text)
            .enter()
            .append("text")
            .attrs({
                'x': -5,
                'y': (d, i) => i*dimensions.height,
                'text-anchor': "end",
                "dy": ".35em"
            })
            .text(d => d)
    };
    
};