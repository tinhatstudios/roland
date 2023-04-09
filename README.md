# Roland
A tool that lets you use an external text editor (VS Code, Sublime, etc.) with Roblox.

## Directory Structure
By default, Roland watches the `game` directory. Roland treats the root directory as equivalent to `game` in Roblox. Any directory contained by `game` is then treated as having an equivalent in Roblox. This means there is a 1:1 relation to the structure managed by Roland and the structure within Roblox. For example, `game/ServerStorage` would be `game.ServerStorage` in Roblox, so a file `game/ServerStorage/foo.lua` would be the ModuleScript `game.ServerStorage.foo`.

Roland treats any object within Roblox as a directory. This means that Bar in `game/ServerStorage/Bar/foo.lua` doesn't have to be a Folder object. However, if Bar does not exist, Roland will automatically create it as a Folder object.

## Configuration
Create a roland.json file to configure Roland:
```jsonc
{
  // what port Roland listen to
  "port": 3000,
  
  // what directory Roland treats as the root directory
  "rootDirectory": "game", 
}
```

## Limitations
Right now, there is no way to have any children under a Script. Roland also only manages scripts at the moment so any other object type must be edited within Roblox Studio. Those features are planned but aren't a priority at this time.

## Why?
Roland was born out of wanting a tool that can be used to sync files outside of Roblox. There are similar tools that sync files to/from Roblox, however, they require total control over the directories they manage. In other words, if they see a file, or a file does not exist, inside a directory the tool manages, it will delete the equivalent object inside of Roblox. Because of this design choice, you have to be careful of what directories you sync and where you create your objects in Roblox because there is always a risk the tool will clobber those files/objects. Roland takes the opposite approach. Instead of managing entire directories, Roland manages individual files. If Roland sees a file/object it doesn't manage, it won't touch it. This also has the added benefit of allowing new users to gradually transition their Roblox games.
