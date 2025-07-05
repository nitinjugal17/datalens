'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import type { SavedDashboard } from '@/lib/types';

// The path to the JSON file that acts as our database
const dataFilePath = path.join(process.cwd(), 'src/data/dashboards.json');

async function readData(): Promise<SavedDashboard[]> {
    try {
        const fileContent = await fs.readFile(dataFilePath, 'utf-8');
        return JSON.parse(fileContent) as SavedDashboard[];
    } catch (error: any) {
        // If the file doesn't exist, return an empty array
        if (error.code === 'ENOENT') {
            await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
            await fs.writeFile(dataFilePath, '[]', 'utf-8');
            return [];
        }
        throw error;
    }
}

async function writeData(data: SavedDashboard[]): Promise<void> {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/dashboards
// Returns a list of dashboards without the data payload.
export async function GET() {
    try {
        const dashboards = await readData();
        // Exclude the large 'data' and 'fileHeaders' fields from the list response
        const metadata = dashboards.map(({ data, fileHeaders, ...meta }) => meta);
        return NextResponse.json(metadata);
    } catch (error) {
        console.error('Failed to read dashboards:', error);
        return NextResponse.json({ message: 'Failed to retrieve dashboards' }, { status: 500 });
    }
}

// POST /api/dashboards
// Saves a new dashboard.
export async function POST(request: NextRequest) {
    try {
        const newDashboard: SavedDashboard = await request.json();
        
        if (!newDashboard.id || !newDashboard.name || !newDashboard.charts) {
            return NextResponse.json({ message: 'Invalid dashboard data provided' }, { status: 400 });
        }

        const dashboards = await readData();
        
        if (dashboards.some(d => d.id === newDashboard.id)) {
            return NextResponse.json({ message: `Dashboard with id ${newDashboard.id} already exists` }, { status: 409 });
        }
        
        dashboards.push(newDashboard);
        await writeData(dashboards);
        
        return NextResponse.json(newDashboard, { status: 201 });
    } catch (error) {
        console.error('Failed to save dashboard:', error);
        return NextResponse.json({ message: 'Failed to save dashboard' }, { status: 500 });
    }
}
