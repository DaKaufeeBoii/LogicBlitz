import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pbxdapshvqdizvoteujs.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBieGRhcHNodnFkaXp2b3RldWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTE0NDEsImV4cCI6MjA4ODUyNzQ0MX0.qhSwD69VziluD_I0ik2e1nEbd522CohRWoAtu8Nk9G8";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('scores').select('*').limit(1);
    if (error) {
        console.error("SELECT ERROR:", error);
    } else {
        console.log("SCORES SCHEMA CHECK. DO WE HAVE time_taken?:");
        if (data.length > 0) {
            console.log(Object.keys(data[0]));
        } else {
            console.log("Table is empty, trying to insert a mock score to see if it fails due to time_taken...");
            const mockResult = await supabase.from('scores').insert([{
                quiz_id: "00000000-0000-0000-0000-000000000000",
                score: 1,
                total: 1,
                time_taken: 10
            }]);
            console.log("MOCK INSERT RESULT:", mockResult);
        }
    }
}

check();
