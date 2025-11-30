import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch,
  Slider,
  Divider,
  Stack,
  Select,
  FormControl,
  InputLabel,
  MenuItem
} from '@mui/material';

const FormElementsSection = () => {
  const [sliderValue, setSliderValue] = useState(30);

  return (
    <Card elevation={2} sx={{ height: "100%" }}>
      <CardHeader title="Form Elements" />
      <Divider />
      <CardContent>
        <Stack spacing={3}>
          <TextField
            label="Text Field"
            variant="standard"
            size="small"
            fullWidth
          />
          <TextField
            label="Error State"
            variant="standard"
            size="small"
            error
            helperText="This field has an error"
            fullWidth
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Select Option</InputLabel>
            <Select label="Select Option" defaultValue="">
              <MenuItem value="option1">Option 1</MenuItem>
              <MenuItem value="option2">Option 2</MenuItem>
              <MenuItem value="option3">Option 3</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <FormControlLabel
              control={<Checkbox defaultChecked />}
              label="Checkbox"
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Switch"
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Radio Buttons
            </Typography>
            <RadioGroup defaultValue="option1" row>
              <FormControlLabel
                value="option1"
                control={<Radio size="small" />}
                label="Option 1"
              />
              <FormControlLabel
                value="option2"
                control={<Radio size="small" />}
                label="Option 2"
              />
            </RadioGroup>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default FormElementsSection;