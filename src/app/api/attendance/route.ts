import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First get ALL task logs
    const { data: taskLogs, error: taskLogError } = await supabase
      .from('tasklog')
      .select('*')
      .order('date_created', { ascending: false });

    if (taskLogError) throw taskLogError;

    if (!taskLogs) {
      return NextResponse.json([]);
    }

    // Now get ALL users to match ReferenceID with names
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('ReferenceID, Firstname, Lastname');

    if (usersError) throw usersError;

    // Create a map for quick lookup of user full names
    const userMap = new Map();
    users?.forEach(user => {
      const fullName = `${user.Firstname || ''} ${user.Lastname || ''}`.trim();
      userMap.set(user.ReferenceID, fullName);
    });

    // Process each task log
    const processedLogs = taskLogs.map((log) => {
      let displayLocation = log.Location;
      
      // If no location but we have lat/lng, format them
      if (!displayLocation && log.Latitude && log.Longitude) {
        displayLocation = `${log.Latitude}, ${log.Longitude}`;
      }

      // Get the user's full name from our map
      const userFullName = userMap.get(log.ReferenceID) || log.ReferenceID;

      return {
        ...log,
        Fullname: userFullName,
        DisplayLocation: displayLocation
      };
    });

    return NextResponse.json(processedLogs);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}