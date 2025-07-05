import type { Template } from './types';

export const templates: Template[] = [
  {
    id: 'sales-analytics',
    name: 'Sales Analytics',
    description: 'A comprehensive dashboard to analyze sales performance, track revenue, and monitor key sales metrics across different regions and product categories.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'sales chart',
    requiredFields: [
      { key: 'orderDate', label: 'Order Date', description: 'The date when the order was placed.', type: 'time' },
      { key: 'region', label: 'Region', description: 'Geographical region of the sale.', type: 'dimension' },
      { key: 'productCategory', label: 'Product Category', description: 'The category of the product sold.', type: 'dimension' },
      { key: 'salesRevenue', label: 'Sales Revenue', description: 'The total monetary value of the sale.', type: 'measure' },
      { key: 'unitsSold', label: 'Units Sold', description: 'The number of units sold.', type: 'measure' },
    ],
    charts: [
        { title: 'Sales Revenue by Region', chartType: 'bar', dimensionKey: 'region', measureKeys: ['salesRevenue'] },
        { title: 'Sales by Category', chartType: 'pie', dimensionKey: 'productCategory', measureKeys: ['salesRevenue'] },
        { title: 'Sales Trend Over Time', chartType: 'line', dimensionKey: 'orderDate', measureKeys: ['salesRevenue'] },
    ]
  },
  {
    id: 'marketing-performance',
    name: 'Marketing Performance',
    description: 'Track the effectiveness of marketing campaigns by analyzing leads, conversions, and cost per acquisition.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'marketing graph',
    requiredFields: [
        { key: 'campaignDate', label: 'Campaign Date', description: 'Date of the marketing activity.', type: 'time' },
        { key: 'channel', label: 'Marketing Channel', description: 'The channel used for the campaign.', type: 'dimension' },
        { key: 'impressions', label: 'Impressions', description: 'Total number of times the ad was displayed.', type: 'measure' },
        { key: 'clicks', label: 'Clicks', description: 'Total number of clicks on the ad.', type: 'measure' },
        { key: 'conversions', label: 'Conversions', description: 'Number of desired actions taken.', type: 'measure' },
    ],
    charts: [
        { title: 'Conversions Funnel', chartType: 'funnel', dimensionKey: 'channel', measureKeys: ['conversions'] },
        { title: 'Campaign Performance Over Time', chartType: 'area', dimensionKey: 'campaignDate', measureKeys: ['impressions', 'clicks'] },
    ]
  },
  {
    id: 'population-analysis',
    name: 'Population & Census',
    description: 'Analyze demographic data. Visualize population distribution by area and age, and track key indicators like income.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'population pyramid',
    requiredFields: [
      { key: 'censusYear', label: 'Census Year', description: 'The year the data was collected.', type: 'time' },
      { key: 'geographicArea', label: 'Geographic Area', description: 'The region, state, or city for the data.', type: 'dimension' },
      { key: 'ageGroup', label: 'Age Group', description: 'The demographic age bracket.', type: 'dimension' },
      { key: 'totalPopulation', label: 'Total Population', description: 'The total population count.', type: 'measure' },
      { key: 'medianIncome', label: 'Median Income', description: 'The median household income.', type: 'measure' },
    ],
    charts: [
        { title: 'Population by Area', chartType: 'treemap', dimensionKey: 'geographicArea', measureKeys: ['totalPopulation'] },
        { title: 'Demographics Radar', chartType: 'radar', dimensionKey: 'ageGroup', measureKeys: ['totalPopulation', 'medianIncome'] },
        { title: 'Population Growth Over Time', chartType: 'line', dimensionKey: 'censusYear', measureKeys: ['totalPopulation'] },
    ]
  },
  {
    id: 'public-health-analysis',
    name: 'Public Health Analysis',
    description: 'Monitor public health indicators, track disease trends, and analyze healthcare outcomes across different populations.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'health statistics',
    requiredFields: [
      { key: 'reportYear', label: 'Report Year', description: 'The year the health data was reported.', type: 'time' },
      { key: 'location', label: 'Location', description: 'The county, state, or country for the health data.', type: 'dimension' },
      { key: 'healthIndicator', label: 'Health Indicator', description: 'The specific health metric being measured.', type: 'dimension' },
      { key: 'indicatorValue', label: 'Indicator Value', description: 'The numeric value of the health indicator.', type: 'measure' },
      { key: 'populationSize', label: 'Population Size', description: 'The size of the population to which the indicator applies.', type: 'measure' },
    ],
    charts: [
        { title: 'Indicator Value vs Population', chartType: 'scatter', dimensionKey: 'location', measureKeys: ['populationSize', 'indicatorValue'] },
        { title: 'Indicator Trends Over Time', chartType: 'line', dimensionKey: 'reportYear', measureKeys: ['indicatorValue'] },
    ]
  },
  {
    id: 'education-statistics',
    name: 'Education Statistics',
    description: 'Analyze key education metrics such as graduation rates, enrollment numbers, and student-teacher ratios by region.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'education chart',
    requiredFields: [
      { key: 'academicYear', label: 'Academic Year', description: 'The school year for which the data is reported.', type: 'time' },
      { key: 'schoolDistrict', label: 'School District', description: 'The school district or specific school.', type: 'dimension' },
      { key: 'studentDemographic', label: 'Student Demographic', description: 'The group of students being analyzed.', type: 'dimension' },
      { key: 'graduationRate', label: 'Graduation Rate', description: 'The percentage of students who graduate.', type: 'measure' },
      { key: 'enrollmentCount', label: 'Enrollment Count', description: 'The total number of students enrolled.', type: 'measure' },
    ],
    charts: [
        { title: 'Graduation Rate by District', chartType: 'bar', dimensionKey: 'schoolDistrict', measureKeys: ['graduationRate'] },
        { title: 'Enrollment by Demographic', chartType: 'pie', dimensionKey: 'studentDemographic', measureKeys: ['enrollmentCount'] },
        { title: 'Enrollment Trends Over Time', chartType: 'area', dimensionKey: 'academicYear', measureKeys: ['enrollmentCount'] },
    ]
  },
  {
    id: 'project-management',
    name: 'Project Management',
    description: 'Track project tasks, timelines, and progress using a Gantt chart to visualize your project schedule.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'gantt chart',
    requiredFields: [
      { key: 'taskName', label: 'Task Name', description: 'The name or description of the project task.', type: 'dimension' },
      { key: 'startDate', label: 'Start Date', description: 'The date the task is scheduled to begin.', type: 'time' },
      { key: 'endDate', label: 'End Date', description: 'The date the task is scheduled to be completed.', type: 'time' },
      { key: 'status', label: 'Status', description: 'The current status of the task (e.g., Not Started, In Progress, Complete).', type: 'dimension' },
    ],
    charts: [
        { title: 'Project Timeline', chartType: 'gantt', dimensionKey: 'taskName', measureKeys: ['startDate', 'endDate'] },
        { title: 'Tasks by Status', chartType: 'pie', dimensionKey: 'status', measureKeys: ['taskName'] },
    ]
  },
];
