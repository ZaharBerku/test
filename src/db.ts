import { createClient } from "@supabase/supabase-js";
import { ConfigService } from "./config/config.service";

const config = new ConfigService();

const supabaseUrl = config.get("SUPABASE_URL");
const supabaseKey = config.get("SUPABASE_API_KEY");

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
