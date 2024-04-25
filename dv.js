async function create_bar_chart() 
{
    const park_data = await d3.csv("data/parks.csv");
    const species_data = await d3.csv("data/species.csv");
    const margin = {top: 20, right: 30, bottom: 50, left: 100},
          width = 2*(960 - margin.left - margin.right),
          height = 2 * (500 - margin.top - margin.bottom);  
    
    const svg = d3.select("#map").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const states = ['AZ', 'CO', 'KY', 'WA', 'TX','AK', 'FL', 'UT'];
    const parks_filtered = park_data.filter(park => states.includes(park.State));
    const park_categories = d3.rollups(species_data, v => v.length, d => d["Park Name"], d => d.Category);
    const mapped_parks = parks_filtered.map(park => {
        const categories = park_categories.find(([name]) => name === park["Park Name"])?.[1];
        return {
            state: park.State,
            park_name: park["Park Name"],
            species_count: park["Species count"],
            categories: categories || []
        };
    });
    const color_list = ['#e6194B', '#f58231', '#ffe119', '#4363d8', '#911eb4','#3cb44b', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', 
        '#008080', '#e6beff', '#9a6324', '#fffac8'];
    const state_data = d3.groups(mapped_parks, d => d.state)
        .map(([state, parks]) => ({
            state,
            parks: parks.map(park => ({
                name: park.park_name,
                count: +park.species_count,
                categories: park.categories.map(([category, count]) => ({
                    category,
                    count
                }))
            }))
        }));
        state_data.forEach(item => console.log(item.state,item.parks));
        

        const scale_y = d3.scaleBand()
            .domain(states)
            .range([0, height])
            .padding(0.1);

    const scale_x = d3.scaleLinear()
        .domain([0, 20000])
        .range([0, width]);

    const categories = new Set(species_data.map(d => d.Category));
    const cat_color_scale = d3.scaleOrdinal()
        .domain([...categories])
        .range(color_list);

    const tooltip = d3.select("#tooltip");
    state_data.forEach(state => {
        let x0 = 0;
        const state_group = svg.append("g").attr("transform", `translate(0, ${scale_y(state.state)})`);

        state.parks.forEach(park => {
            const bar_width = scale_x(park.count);
            const park_group = state_group.append("g").attr("transform", `translate(${x0}, 0)`);

            const treemap = d3.treemap()
                .size([bar_width - 4, (scale_y.bandwidth() - 4)*0.9])
                .paddingInner(1)
                .round(true)
                (d3.hierarchy({children: park.categories}).sum(d => d.count));
            
            park_group.selectAll("rect")
                .data(treemap.leaves())
                .join("rect")
                .attr("x", d => d.x0 + 2)
                .attr("y", d => d.y0 + 2)
                .attr("width", d => d.x1 - d.x0)
                .attr("height", d => d.y1 - d.y0)
                .attr("fill", d => cat_color_scale(d.data.category))
                .attr("stroke", "black")  
                .attr("stroke-width", 0.8)  

                .on("mouseover", (event, d) => {
                    tooltip.style("opacity", 1)
                           .html(`<strong>Park:</strong> ${park.name}<br><strong>State:</strong> ${state.state}<br><strong>Category: </strong>${d.data.category}<br><strong>Count:</strong> ${d.value}`)
                           .style("left", `${event.pageX + 10}px`)
                           .style("top", `${event.pageY + 10}px`);
                })
                .on("mousemove", (event, d) => {
                    tooltip.style("left", `${event.pageX + 10}px`)
                           .style("top", `${event.pageY + 10}px`);
                })
                .on("mouseout", () => {
                    tooltip.style("opacity", 0);
                });

            x0 += bar_width+2.5;
        });
        const legend = svg.append("g")
            .attr("transform", `translate(${width + margin.left - 750}, ${margin.top + 20})`);  

        legend.append("text")
            .attr("x", -300)
            .attr("y", 0)
            .attr("text-anchor", "left")
            .style("font-size", "18px") 
            .style("font-weight", "bold")
            .text("Species Category") ;

        const legend_categories = Array.from(categories);  
        const rect_height = 20;  
        const rect_width = 20;   
        const padding = 5;     
        const offset = rect_width + 10;  
        const line_height = rect_height + padding;
        const legend_width = 180;  
        const legend_height = legend_categories.length * line_height + 20;  

        legend_categories.forEach((category, index) => {
            const legend_content = legend.append("g")
                .attr("transform", `translate(-300, ${index * line_height + 25})`);  

            legend_content.append("rect")
                .attr("width", rect_width)
                .attr("height", rect_height)
                .attr("fill", cat_color_scale(category))
                .attr("stroke", "black");

            legend_content.append("text")
                .attr("x", offset)
                .attr("y", rect_height / 2 + 4)  
                .text(category)
                .style("font-size", "16px")
                .style("font-family", "Helvetica, Arial, sans-serif")
                .style("font-weight", "normal")  
                .style("font-style", "normal")  
                .attr("text-anchor", "start");
        });
        legend.append("rect")
            .attr("x", -310) 
            .attr("y", -30)
            .attr("width", legend_width+40)
            .attr("height", legend_height+40)
            .attr("fill", "none")
            .attr("rx", 15)  
            .attr("ry", 15)
            .attr("stroke", "black");
    });
    const xAxis = svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(scale_x));
    
    xAxis.selectAll("text")
        .style("font-size", "16px")  
        .style("font-weight", "bold");  

    const yAxis = svg.append("g")
        .call(d3.axisLeft(scale_y));

    yAxis.selectAll("text")
        .style("font-size", "16px")  
        .style("font-weight", "bold");  

    svg.append("text")
        .attr("x", -400)
        .attr("y", -50)
        .style("text-anchor", "start")
        .style("font-size", "20px")
        .attr("transform", "rotate(-90)")
        .style("font-weight", "bold")
        .text("States");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Number of Species");
}
create_bar_chart();
