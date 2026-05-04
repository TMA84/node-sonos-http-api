# TTS Providers

Text-to-speech is available via `/{room}/say/{text}` and `/sayall/{text}`. Configure your preferred provider in `settings.json`.

## Google (default)

No configuration needed. Works out of the box.

```
/Office/say/Hello+world/en
/Office/say/Hallo+Welt/de
```

## AWS Polly

```json5
{
  aws: {
    credentials: {
      region: "eu-west-1",
      accessKeyId: "YOUR_KEY",
      secretAccessKey: "YOUR_SECRET"
    },
    name: "Vicki"  // or "VickiNeural" for neural voice
  }
}
```

## ElevenLabs

```json5
{
  elevenlabs: {
    auth: { apiKey: "YOUR_API_KEY" },
    config: {
      voiceId: "VOICE_ID",
      modelId: "eleven_multilingual_v2"
    }
  }
}
```

## Microsoft Cognitive Services

```json5
{
  microsoft: {
    key: "YOUR_BING_SPEECH_API_KEY",
    name: "ZiraRUS"
  }
}
```

## VoiceRSS

```json5
{
  voicerss: "YOUR_API_KEY"
}
```

## macOS Say (local only)

```json5
{
  macSay: {
    voice: "Alex",
    rate: 90
  }
}
```

## Usage

```bash
# Default language (en)
curl http://localhost:5005/Living+Room/say/Hello

# With language
curl http://localhost:5005/Living+Room/say/Guten+Morgen/de

# With language and volume
curl http://localhost:5005/Living+Room/say/Attention/en/60

# All rooms
curl http://localhost:5005/sayall/Fire+alarm
```
