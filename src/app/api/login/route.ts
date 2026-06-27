import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    console.log('Login attempt for username:', username);

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('userName', username)
      .single();

    // If userName didn't find, try Email
    if (error || !user) {
      const result = await supabase
        .from('users')
        .select('*')
        .eq('Email', username)
        .single();
      user = result.data;
      error = result.error;
    }

    console.log('Supabase query error:', error);
    console.log('Fetched user:', user ? { ...user, Password: 'REDACTED' } : null);

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    let passwordMatch = false;
    // Try bcrypt first
    try {
      passwordMatch = await bcrypt.compare(password, user.Password);
    } catch (bcryptError) {
      console.log('Bcrypt error, trying plain text:', bcryptError);
      // If bcrypt fails (e.g., password isn't a hash), try plain text
      passwordMatch = password === user.Password;
    }
    console.log('Password match:', passwordMatch);
    
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Return user without password field
    const { Password, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
