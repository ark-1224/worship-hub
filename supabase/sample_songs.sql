-- sample_songs.sql  (optional; run by hand in the Supabase SQL editor, NOT a migration)
--
-- Adds 10 public-domain hymns so you have real songs to try the app with
-- (view, transpose, edit). The words are old enough to be out of copyright;
-- the chords are simple hymn-book style. Add YouTube links by editing each song.
--
-- Safe to run twice: a song is skipped if one with the same title already exists.
-- Each song also gets a song_versions row, just like a save from the app.
-- (The SQL editor has no logged-in user, so "created by" stays empty.)

with v (title, artist, original_key, tags, chord_text) as (
  values

  ('Amazing Grace', 'John Newton', 'G', array['hymn','grace'], $chp$
{comment: Verse 1}
[G]Amazing [G7]grace, how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me
I [G]once was [G7]lost, but [C]now am [G]found
Was [Em]blind but [D]now I [G]see

{comment: Verse 2}
[G]'Twas grace that [G7]taught my [C]heart to [G]fear
And [G]grace my [Em]fears re[D]lieved
How [G]precious [G7]did that [C]grace ap[G]pear
The [Em]hour I [D]first be[G]lieved

{comment: Verse 3}
[G]Through many [G7]dangers, [C]toils and [G]snares
I [G]have al[Em]ready [D]come
'Tis [G]grace hath [G7]brought me [C]safe thus [G]far
And [Em]grace will [D]lead me [G]home
$chp$),

  ('Holy, Holy, Holy', 'Reginald Heber', 'D', array['hymn','trinity','praise'], $chp$
{comment: Verse 1}
[D]Holy, holy, [G]holy! [D]Lord God Al[A]mighty!
[D]Early in the [G]morning our [D]song shall [A]rise to Thee
[D]Holy, holy, [G]holy! Mer[D]ciful and [A]Mighty!
[D]God in three [G]Persons, [D]blessed [A]Trin[D]ity!

{comment: Verse 2}
[D]Holy, holy, [G]holy! [D]All the saints a[A]dore Thee
[D]Casting down their [G]golden [D]crowns a[A]round the glassy sea
[D]Cherubim and [G]seraphim [D]falling [A]down before Thee
[D]Which wert, and [G]art, and [D]evermore [A]shalt [D]be
$chp$),

  ('Be Thou My Vision', 'Eleanor Hull (traditional Irish)', 'D', array['hymn','devotion'], $chp$
{comment: Verse 1}
[D]Be Thou my [G]Vision, O [D]Lord of my [A]heart
[D]Naught be all [G]else to me, [D]save that Thou [A]art
[Bm]Thou my best [G]Thought, by [D]day or by [A]night
[D]Waking or [G]sleeping, Thy [D]presence my [A]light [D]

{comment: Verse 2}
[D]Be Thou my [G]Wisdom, and [D]Thou my true [A]Word
[D]I ever with [G]Thee and Thou [D]with me, [A]Lord
[Bm]Thou my great [G]Father, I [D]Thy true [A]son
[D]Thou in me [G]dwelling, and [D]I with Thee [A]one [D]

{comment: Verse 3}
[D]High King of [G]Heaven, my [D]victory [A]won
[D]May I reach [G]Heaven's joys, O [D]bright Heaven's [A]Sun
[Bm]Heart of my [G]own heart, what[D]ever be[A]fall
[D]Still be my [G]Vision, O [D]Ruler of [A]all [D]
$chp$),

  ('It Is Well With My Soul', 'Horatio Spafford / Philip Bliss', 'C', array['hymn','peace','comfort'], $chp$
{comment: Verse 1}
[C]When peace like a [F]river at[C]tendeth my [G]way
[C]When sorrows like [F]sea billows [C]roll
[C]Whatever my [F]lot, Thou hast [C]taught me to [G]say
[C]It is [G]well, it is [C]well with my [F]soul [C]

{comment: Chorus}
[C]It is well, [F]it is well with my [C]soul
[C]It is [G]well, it is [C]well with my [F]soul [C]

{comment: Verse 2}
[C]Though Satan should [F]buffet, though [C]trials should [G]come
[C]Let this blest as[F]surance con[C]trol
[C]That Christ hath re[F]garded my [C]helpless es[G]tate
[C]And hath [G]shed His own [C]blood for my [F]soul [C]

{comment: Verse 3}
[C]My sin, oh, the [F]bliss of this [C]glorious [G]thought
[C]My sin, not in [F]part but the [C]whole
[C]Is nailed to the [F]cross, and I [C]bear it no [G]more
[C]Praise the [G]Lord, praise the [C]Lord, O my [F]soul [C]
$chp$),

  ('Come, Thou Fount of Every Blessing', 'Robert Robinson', 'D', array['hymn','grace','classic'], $chp$
{comment: Verse 1}
[D]Come, Thou [G]Fount of [D]every [A]blessing
[D]Tune my [G]heart to [D]sing Thy [A]grace
[D]Streams of [G]mercy, [D]never [A]ceasing
[D]Call for [G]songs of [D]loudest [A]praise [D]

{comment: Verse 2}
[D]Here I [G]raise mine [D]Eben[A]ezer
[D]Hither [G]by Thy [D]help I'm [A]come
[D]And I [G]hope, by [D]Thy good [A]pleasure
[D]Safely [G]to ar[D]rive at [A]home [D]

{comment: Verse 3}
[D]Jesus [G]sought me [D]when a [A]stranger
[D]Wandering [G]from the [D]fold of [A]God
[D]He, to [G]rescue [D]me from [A]danger
[D]Interposed His [G]precious [D]blood
$chp$),

  ('Blessed Assurance', 'Fanny Crosby', 'D', array['hymn','assurance','testimony'], $chp$
{comment: Verse 1}
[D]Blessed as[A]surance, [D]Jesus is [A]mine
[D]O what a [G]foretaste of [D]glory di[A]vine
[D]Heir of sal[A]vation, [D]purchase of [A]God
[D]Born of His [G]Spirit, [D]washed in His [A]blood [D]

{comment: Chorus}
[D]This is my [G]story, [D]this is my [A]song
[D]Praising my [G]Savior all the [D]day long [A]
[D]This is my [G]story, [D]this is my [A]song
[D]Praising my [G]Savior all the [D]day [A]long [D]

{comment: Verse 2}
[D]Perfect sub[A]mission, [D]perfect de[A]light
[D]Visions of [G]rapture now [D]burst on my [A]sight
[D]Angels de[A]scending [D]bring from a[A]bove
[D]Echoes of [G]mercy, [D]whispers of [A]love [D]
$chp$),

  ('What a Friend We Have in Jesus', 'Joseph Scriven / Charles Converse', 'C', array['hymn','prayer','comfort'], $chp$
{comment: Verse 1}
[C]What a Friend we [F]have in [C]Jesus
[C]All our sins and [G]griefs to [C]bear
[C]What a privi[F]lege to [C]carry
[C]Everything to [G]God in [C]prayer
[C]O what peace we [F]often for[C]feit
[C]O what needless [G]pain we [C]bear
[C]All because we [F]do not [C]carry
[C]Everything to [G]God in [C]prayer

{comment: Verse 2}
[C]Have we trials [F]and temp[C]tations
[C]Is there trouble [G]any[C]where
[C]We should never [F]be dis[C]couraged
[C]Take it to the [G]Lord in [C]prayer
[C]Can we find a [F]friend so [C]faithful
[C]Who will all our [G]sorrows [C]share
[C]Jesus knows our [F]every [C]weakness
[C]Take it to the [G]Lord in [C]prayer
$chp$),

  ('Joy to the World', 'Isaac Watts', 'D', array['hymn','christmas','advent'], $chp$
{comment: Verse 1}
[D]Joy to the world! the [A]Lord is [D]come
[D]Let earth re[A]ceive her [D]King
[D]Let every [G]heart pre[D]pare Him [A]room
[D]And heaven and [A]nature [D]sing
[D]And heaven and [A]nature [D]sing
[D]And heaven, and [G]heaven and [A]nature [D]sing

{comment: Verse 2}
[D]Joy to the earth! the [A]Savior [D]reigns
[D]Let men their [A]songs em[D]ploy
[D]While fields and [G]floods, rocks, [D]hills and [A]plains
[D]Repeat the [A]sounding [D]joy
[D]Repeat the [A]sounding [D]joy
[D]Repeat, re[G]peat the [A]sounding [D]joy

{comment: Verse 3}
[D]He rules the world with [A]truth and [D]grace
[D]And makes the [A]nations [D]prove
[D]The glories [G]of His [D]righteous[A]ness
[D]And wonders [A]of His [D]love
[D]And wonders [A]of His [D]love
[D]And wonders, [G]wonders [A]of His [D]love
$chp$),

  ('Silent Night', 'Joseph Mohr / Franz Gruber', 'G', array['hymn','christmas'], $chp$
{comment: Verse 1}
[G]Silent night, holy night
All is [D]calm, all is [G]bright
Round yon [C]Virgin Mother and [G]Child
Holy [C]Infant so tender and [G]mild
Sleep in [D]heavenly [G]peace [C]
Sleep in [G]heavenly [D]peace [G]

{comment: Verse 2}
[G]Silent night, holy night
Shepherds [D]quake at the [G]sight
Glories [C]stream from heaven a[G]far
Heavenly [C]hosts sing Al[G]leluia
Christ the [D]Savior is [G]born [C]
Christ the [G]Savior is [D]born [G]

{comment: Verse 3}
[G]Silent night, holy night
Son of [D]God, love's pure [G]light
Radiant [C]beams from Thy holy [G]face
With the [C]dawn of redeeming [G]grace
Jesus, [D]Lord, at Thy [G]birth [C]
Jesus, [G]Lord, at Thy [D]birth [G]
$chp$),

  ('Just As I Am', 'Charlotte Elliott', 'G', array['hymn','invitation','salvation'], $chp$
{comment: Verse 1}
[G]Just as I am, [D]without one [G]plea
[G]But that Thy [C]blood was [G]shed for [D]me
[G]And that Thou [C]bidd'st me [G]come to [D]Thee
[G]O Lamb of [D]God, I [G]come, I [D]come [G]

{comment: Verse 2}
[G]Just as I am, [D]and waiting [G]not
[G]To rid my [C]soul of [G]one dark [D]blot
[G]To Thee whose [C]blood can [G]cleanse each [D]spot
[G]O Lamb of [D]God, I [G]come, I [D]come [G]

{comment: Verse 3}
[G]Just as I am, [D]though tossed a[G]bout
[G]With many a [C]conflict, [G]many a [D]doubt
[G]Fightings with[C]in, and [G]fears with[D]out
[G]O Lamb of [D]God, I [G]come, I [D]come [G]
$chp$)
),

new_songs as (
  insert into public.songs (title, artist, original_key, tags, chord_text)
  select v.title, v.artist, v.original_key, v.tags, btrim(v.chord_text, E'\n')
  from v
  where not exists (
    select 1 from public.songs s where lower(s.title) = lower(v.title)
  )
  returning id, title, chord_text
)
insert into public.song_versions (song_id, title, chord_text, edit_note)
select id, title, chord_text, 'Sample song (public-domain hymn)'
from new_songs;

-- Check: select title, original_key from public.songs order by title;
